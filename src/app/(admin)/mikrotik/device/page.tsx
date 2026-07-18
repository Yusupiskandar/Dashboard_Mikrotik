"use client";

import React, { useState, useEffect } from "react";
import { PlugInIcon } from "@/icons";

interface Device {
  id: string;
  name: string;
  ip: string;
  status?: "online" | "offline" | null;
  time?: number;
  checking?: boolean;
  error?: string;
  lastChecked?: string;
}

export default function DeviceMonitorPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [ipInput, setIpInput] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mikrotik-monitored-devices");
    if (saved) {
      try {
        setDevices(JSON.parse(saved));
      } catch (e) {}
    }
    setIsLoaded(true);
  }, []);

  const saveDevices = (newDevices: Device[]) => {
    setDevices(newDevices);
    localStorage.setItem("mikrotik-monitored-devices", JSON.stringify(newDevices));
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput || !ipInput) return;

    const newDevice: Device = {
      id: Date.now().toString(),
      name: nameInput,
      ip: ipInput,
      status: null,
      checking: false,
    };

    saveDevices([...devices, newDevice]);
    setNameInput("");
    setIpInput("");
  };

  const handleDelete = (id: string) => {
    saveDevices(devices.filter((d) => d.id !== id));
  };

  const pingDevice = async (id: string) => {
    const device = devices.find((d) => d.id === id);
    if (!device) return;

    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, checking: true, error: undefined } : d))
    );

    try {
      const res = await fetch("/api/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: device.ip }),
      });
      const json = await res.json();

      const now = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          if (!json.success) {
            return { ...d, checking: false, error: json.message, status: "offline", lastChecked: now };
          }
          return {
            ...d,
            checking: false,
            status: json.data.isAlive ? "online" : "offline",
            time: json.data.time,
            lastChecked: now,
          };
        })
      );
    } catch (err) {
      const now = new Date().toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setDevices((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, checking: false, error: "Network error", status: "offline", lastChecked: now } : d
        )
      );
    }
  };

  const pingAll = () => {
    devices.forEach((d) => pingDevice(d.id));
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-title-md2 font-semibold text-black dark:text-white">
            Monitor Devices
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kelola dan pantau banyak device sekaligus
          </p>
        </div>
        <button
          onClick={pingAll}
          disabled={devices.length === 0 || devices.some((d) => d.checking)}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          <PlugInIcon />
          Refresh Semua
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Kolom Tambah Device */}
        <div className="xl:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white">
              Tambah Device Baru
            </h3>
            <form onSubmit={handleAddDevice} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Device
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Contoh: Router Cabang 1"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  IP Address
                </label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="Contoh: 192.168.1.10"
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:text-white/90"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!nameInput || !ipInput}
                className="mt-2 w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                Simpan Device
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Daftar Device */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">Device Info</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {devices.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">
                          Belum ada device yang dimonitor.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    devices.map((device) => (
                      <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {device.name}
                          </div>
                          <div className="text-gray-500">{device.ip}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {device.checking ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                            ) : device.status === "online" ? (
                              <>
                                <span className="h-2.5 w-2.5 rounded-full bg-success-500 shadow shadow-success-500/50" />
                                <span>Online {device.time ? `(${device.time}ms)` : ""}</span>
                              </>
                            ) : device.status === "offline" ? (
                              <>
                                <span className="h-2.5 w-2.5 rounded-full bg-error-500 shadow shadow-error-500/50" />
                                <span>Offline</span>
                              </>
                            ) : (
                              <span className="text-gray-400">Belum dicek</span>
                            )}
                          </div>
                          {device.error && (
                            <div className="mt-1 text-xs text-error-500">{device.error}</div>
                          )}
                          {device.lastChecked && (
                            <div className="mt-1 text-xs text-gray-400">
                              Terakhir: {device.lastChecked}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => pingDevice(device.id)}
                              disabled={device.checking}
                              className="rounded bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-100 disabled:opacity-50 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                            >
                              {device.checking ? "Cek..." : "Cek Status"}
                            </button>
                            <button
                              onClick={() => handleDelete(device.id)}
                              disabled={device.checking}
                              className="rounded bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 transition hover:bg-error-100 disabled:opacity-50 dark:bg-error-500/10 dark:text-error-400 dark:hover:bg-error-500/20"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
