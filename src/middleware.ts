import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard');

  // Redirect to login if not authenticated
  if ((isAdminRoute || isDashboardRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Check admin role for admin routes
  if (isAdminRoute && req.auth?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
