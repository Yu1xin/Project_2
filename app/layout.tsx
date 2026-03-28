// app/layout.tsx
import './globals.css';
import Sidebar from './components/Sidebar'; // 确保路径指向你创建 Sidebar 的位置

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 min-h-screen">
        {/* 全局侧边栏组件 */}
        <Sidebar />

        {/* 主内容区域说明：
          使用 padding-left (pl-20) 留出收起时的宽度空间。
          如果是登录页，我们需要移除这个间距（通过一个简单的容器包装，或者在具体页面处理）。
          这里给一个最通用的处理方式：
        */}
        <main className="transition-all duration-300 ease-in-out">
          {children}
        </main>
      </body>
    </html>
  );
}