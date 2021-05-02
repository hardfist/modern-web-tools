import { Injectable } from '@nestjs/common';
import { answer } from '@hardfist/utils';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!' + answer;
  }
}
