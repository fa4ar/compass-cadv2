import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('accessToken')?.value;
    const { pathname } = request.nextUrl;

    // 1. Публичные пути, которые ВСЕГДА доступны
    // (auth страницы, ресурсы, иконки)
    const isAuthPage = pathname.startsWith('/auth/');
    const isStaticRes = pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico';
    const isApi = pathname.startsWith('/api');

    // Главная страница / - тоже публичная, но с логикой
    const isRoot = pathname === '/';

    // 2. Если юзер авторизован и идет на страницу логина — редиректим в личный кабинет
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL('/citizen', request.url));
    }

    // 3. Если это защищенный путь (не auth, не статика, не api, не корень) и токена нет — редирект в логин
    if (!token && !isAuthPage && !isStaticRes && !isApi && !isRoot) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 4. Если юзер авторизован и зашел на корень (/) — кидаем в citizen
    if (token && isRoot) {
        return NextResponse.redirect(new URL('/citizen', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};