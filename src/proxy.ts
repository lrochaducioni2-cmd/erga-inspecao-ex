// Next.js 16: `middleware.ts` virou `proxy.ts` (mesma função). Exige login
// nas áreas do app; a checagem de papel (ADMIN) é feita em cada página/API.
import { withAuth } from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: ["/projetos/:path*", "/clientes/:path*", "/usuarios/:path*", "/campo"],
};
