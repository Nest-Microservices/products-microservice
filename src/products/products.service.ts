import { HttpCode, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected.');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async find(pagination: PaginationDto) {
    const products = await this.product.findMany({
      take: pagination.limit,
      skip: pagination.limit * (pagination.page - 1),
      where: { available: true },
    });

    const countOfProducts = await this.product.count();

    const totalPages = Math.ceil(countOfProducts / pagination.limit);

    return {
      meta: {
        total: countOfProducts,
        totalPages,
        page: pagination.page,
      },
      data: products,
    };
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id, available: true },
    });
    if (!product)
      throw new RpcException({
        message: `Product with id: ${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: _, ...rest } = updateProductDto;

    await this.findOne(id);

    const productUpdated = await this.product.update({
      where: { id },
      data: rest,
    });

    return productUpdated;
  }

  async remove(id: number) {
    await this.findOne(id);
    // return this.product.delete({ where: { id } });
    return this.product.update({
      where: { id },
      data: { available: false },
    });
  }

  async validateProduct(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: { id: { in: ids } },
    });

    if ( products.length !== ids.length ) {
      throw new RpcException({message:'Some products were not found', status: HttpStatus.BAD_REQUEST});
    }

    return products;
  }
}
