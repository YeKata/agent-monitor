import { Module } from '@nestjs/common';
import { MonitorModule } from './monitor/monitor.module';

@Module({
  imports: [MonitorModule],
})
export class AppModule {}
