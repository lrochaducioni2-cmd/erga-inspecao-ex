// Foto servida pela rota autenticada /api/fotos/:id. <img> simples de
// propósito: o otimizador de imagens do Next não enxerga a sessão do usuário.
/* eslint-disable @next/next/no-img-element */

export function PhotoThumb({
  id,
  alt,
  className = "",
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  return <img src={`/api/fotos/${id}`} alt={alt} loading="lazy" className={`bg-line object-cover ${className}`} />;
}
