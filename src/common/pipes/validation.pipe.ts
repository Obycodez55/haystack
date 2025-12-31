import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidationError } from '@errors';

/**
 * Custom validation pipe that formats errors to match our API response structure
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  constructor(
    private readonly options?: {
      whitelist?: boolean;
      forbidNonWhitelisted?: boolean;
      transform?: boolean;
      transformOptions?: {
        enableImplicitConversion?: boolean;
      };
    },
  ) {}

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: this.options?.whitelist ?? true,
      forbidNonWhitelisted: this.options?.forbidNonWhitelisted ?? true,
      transform: this.options?.transform ?? true,
      transformOptions: {
        enableImplicitConversion:
          this.options?.transformOptions?.enableImplicitConversion ?? true,
      },
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw ValidationError.invalidValue(
        formattedErrors[0].field,
        formattedErrors[0].value,
        formattedErrors[0].constraint,
      );
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Format class-validator errors to our error structure
   */
  private formatErrors(errors: any[]): Array<{
    field: string;
    value: any;
    constraint: string;
  }> {
    const formatted: Array<{
      field: string;
      value: any;
      constraint: string;
    }> = [];

    errors.forEach((error) => {
      if (error.constraints) {
        Object.keys(error.constraints).forEach((key) => {
          formatted.push({
            field: error.property,
            value: error.value,
            constraint: error.constraints[key],
          });
        });
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nested = this.formatErrors(error.children);
        nested.forEach((nestedError) => {
          formatted.push({
            field: `${error.property}.${nestedError.field}`,
            value: nestedError.value,
            constraint: nestedError.constraint,
          });
        });
      }
    });

    return formatted;
  }
}
