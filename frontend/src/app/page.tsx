export default function HomePage() {
  return (
    <div className="flex h-screen items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-12 h-12 bg-amber-500/20 text-amber-500 font-bold rounded-lg flex items-center justify-center mx-auto text-xl border border-amber-500/30">
          LP
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Legacy Logic Pro</h1>
        <p className="text-xs text-slate-600">
          Document intelligence & practice management platform for Chartered Accountant firms in India.
        </p>
      </div>
    </div>
  );
}
