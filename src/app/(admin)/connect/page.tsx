import React from "react";
import ConnectForm from "@/components/mikrotik/ConnectForm";

export const metadata = {
  title: "Connect | TailAdmin - Next.js Dashboard Template",
  description: "Connect to MikroTik RouterOS",
};

export default function ConnectPage() {
  return (
    <div className="mx-auto max-w-screen-md">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-title-md2 font-semibold text-black dark:text-white">
          Connect to MikroTik
        </h2>
      </div>

      <div className="flex flex-col gap-9">
        {/* Connect Form */}
        <ConnectForm />
      </div>
    </div>
  );
}
