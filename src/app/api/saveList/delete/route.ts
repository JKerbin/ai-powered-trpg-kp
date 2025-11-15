import { NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import path from 'path';
import { stat } from 'fs/promises';

export async function DELETE(request: Request) {
  try {
    const { userId, saveId } = await request.json();
    
    // 验证必要参数
    if (!userId || !saveId) {
      return NextResponse.json(
        { error: '缺少必要参数：userId 或 saveId' },
        { status: 400 }
      );
    }
    
    // 构建存档目录路径
    const saveDir = path.join(process.cwd(), 'user', userId, saveId);
    
    try {
      // 检查目录是否存在
      const dirStat = await stat(saveDir);
      if (!dirStat.isDirectory()) {
        return NextResponse.json(
          { error: '指定的存档不存在' },
          { status: 404 }
        );
      }
    } catch (err) {
      // 如果stat抛出错误，说明目录不存在
      return NextResponse.json(
        { error: '指定的存档不存在' },
        { status: 404 }
      );
    }
    
    // 递归删除存档目录及其所有内容
    await rm(saveDir, { recursive: true, force: true });
    
    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: '存档删除成功'
    }, { status: 200 });
  } catch (error) {
    console.error('删除存档时发生错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除存档失败' },
      { status: 500 }
    );
  }
}