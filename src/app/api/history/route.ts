import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 定义API响应接口
interface HistoryResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 从请求URL中获取查询参数
    const userId = request.nextUrl.searchParams.get('userId');
    const saveId = request.nextUrl.searchParams.get('saveId');

    // 验证参数
    if (!userId || !saveId) {
      return NextResponse.json<HistoryResponse>({
        success: false,
        error: 'Missing required parameters: userId and saveId',
      }, { status: 400 });
    }

    // 构建history.json文件的路径
    // 注意：在实际生产环境中，应该使用更安全的路径处理方式
    const historyFilePath = path.join(
      process.cwd(),
      'user',
      userId,
      saveId,
      'history.json'
    );

    // 检查文件是否存在
    if (!fs.existsSync(historyFilePath)) {
      return NextResponse.json<HistoryResponse>({
        success: false,
        error: 'History file not found',
      }, { status: 404 });
    }

    // 读取并解析文件内容
    const historyContent = fs.readFileSync(historyFilePath, 'utf8');
    const historyData = JSON.parse(historyContent);

    // 返回成功响应
    return NextResponse.json<HistoryResponse>({
      success: true,
      data: historyData,
    });
  } catch (error) {
    console.error('Error processing history request:', error);
    
    // 返回错误响应
    return NextResponse.json<HistoryResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}