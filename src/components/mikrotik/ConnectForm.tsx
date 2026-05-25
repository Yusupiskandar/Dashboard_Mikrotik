"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";

export default function ConnectForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    host: "",
    port: 8728,
    username: "",
    password: "",
    use_ssl: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!formData.host) return "Host is required.";
    if (!formData.port) return "Port is required.";
    if (!formData.username) return "Username is required.";
    if (!formData.password) return "Password is required.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/mikrotik/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to connect to MikroTik");
      }

      setSuccess("Successfully connected to MikroTik. Redirecting...");
      setTimeout(() => router.push("/mikrotik/dashboard"), 800);
    } catch (err: any) {
      setError(err.message || "An error occurred during connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {error && (
          <div className="rounded-lg bg-error-50 p-4 text-sm text-error-800 dark:bg-error-500/10 dark:text-error-400">
            {error}
          </div>
        )}
        
        {success && (
          <div className="rounded-lg bg-success-50 p-4 text-sm text-success-800 dark:bg-success-500/10 dark:text-success-400">
            {success}
          </div>
        )}

        <div>
          <Label htmlFor="host">Host / IP Address</Label>
          <Input
            type="text"
            id="host"
            name="host"
            placeholder="192.168.88.1"
            defaultValue={formData.host}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="port">Port</Label>
          <Input
            type="number"
            id="port"
            name="port"
            placeholder="8728"
            defaultValue={formData.port}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="username">Username</Label>
          <Input
            type="text"
            id="username"
            name="username"
            placeholder="admin"
            defaultValue={formData.username}
            onChange={handleChange}
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            type="password"
            id="password"
            name="password"
            placeholder="••••••••"
            defaultValue={formData.password}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="use_ssl"
            name="use_ssl"
            className="h-5 w-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:ring-offset-gray-900"
            checked={formData.use_ssl}
            onChange={handleChange}
          />
          <Label htmlFor="use_ssl" className="mb-0">
            Use SSL / TLS
          </Label>
        </div>

        <div className="mt-2">
          <Button disabled={loading}>
            {loading ? "Connecting..." : "Connect"}
          </Button>
        </div>
      </form>
    </div>
  );
}
