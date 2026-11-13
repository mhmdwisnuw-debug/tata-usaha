export function PesantrenEmblem({ className = 'w-10 h-10' }: { className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-[#063626] border border-[#E5C158]/40 inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <img
        src="/assets/aistudio/tata_usaha_dfd811ee.png"
        alt="Logo Tata Usaha"
        className="w-full h-full object-cover scale-[1.35] origin-[50%_55%]"
      />
    </div>
  );
}
