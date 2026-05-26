type ImageBoxProps = {
  src?: string | null;
  alt: string;
};

export default function ImageBox({ src, alt }: ImageBoxProps) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-400">
          Sem imagem
        </div>
      )}
    </div>
  );
}