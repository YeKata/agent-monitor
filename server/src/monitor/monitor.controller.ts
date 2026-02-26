import { Controller, Get, Post, Body, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { MonitorService } from './monitor.service';
import type { AgentEvent } from './types';

@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  /**
   * 이벤트 수신 엔드포인트 (Hook에서 POST)
   */
  @Post('event')
  receiveEvent(@Body() event: AgentEvent) {
    this.monitorService.handleEvent({
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    });
    return { success: true };
  }

  /**
   * SSE 스트림 엔드포인트
   */
  @Get('stream')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  stream(@Res() res: Response) {
    // 초기 상태 전송
    const initialState = this.monitorService.getCurrentState();
    res.write(`data: ${JSON.stringify({ type: 'init', data: initialState })}\n\n`);

    // 이벤트 구독
    const subscription = this.monitorService.events$.subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Heartbeat (30초마다)
    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 30000);

    // 연결 종료 시 정리
    res.on('close', () => {
      subscription.unsubscribe();
      clearInterval(heartbeat);
    });
  }

  /**
   * 현재 상태 조회 (폴백용)
   */
  @Get('state')
  getState() {
    return this.monitorService.getCurrentState();
  }

  /**
   * 헬스체크 엔드포인트
   */
  @Get('health')
  getHealth() {
    return this.monitorService.getHealth();
  }
}
