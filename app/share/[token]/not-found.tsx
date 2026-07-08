import { AppLogo } from "@/components/brand/app-logo";

export default function ShareNotFound() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        <div className="mb-6 flex justify-center">
          <AppLogo size="md" variant="login" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Link unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          This share link is invalid or has expired. Ask your Globecon colleague to
          send a fresh link from Tender Watch.
        </p>
        <p className="mt-6 text-xs text-slate-500">
          This page does not provide access to the main Tender Watch system.
        </p>
      </div>
    </div>
  );
}
