"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
};

export default function CustomersPage() {
  const t = useTranslations("customers");
  const locale = useLocale();
  const isEnglish = locale === "en";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadCustomers() {
    try {
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(t("loginRequired"));
        setIsLoaded(true);
        return;
      }

      const { data: membership, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

      if (membershipError) {
        console.error("Company membership error:", membershipError);
        setError(t("companyError"));
        setIsLoaded(true);
        return;
      }

      if (!membership?.company_id) {
        setError(t("companyNotFound"));
        setIsLoaded(true);
        return;
      }

      setCompanyId(membership.company_id);

      const { data, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, created_at")
        .eq("company_id", membership.company_id)
        .order("created_at", { ascending: false });

      if (customersError) {
        console.error("Customers fetch error:", customersError);
        setError(t("loadError"));
        setIsLoaded(true);
        return;
      }

      const formattedCustomers: Customer[] = (data || []).map(
        (customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          status: "active",
        })
      );

      setCustomers(formattedCustomers);
    } catch (error) {
      console.error("Customers loading error:", error);
      setError(t("loadError"));
    } finally {
      setIsLoaded(true);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  async function addCustomer() {
    if (!name.trim()) {
      alert(t("enterName"));
      return;
    }

    if (!companyId) {
      alert(t("companyNotFound"));
      return;
    }

    try {
      setSaving(true);
      setError("");

      const { data, error: insertError } = await supabase
        .from("customers")
        .insert({
          company_id: companyId,
          name: name.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
        })
        .select("id, name, phone, email, created_at")
        .single();

      if (insertError) {
        console.error("Customer insert error:", insertError);
        setError(t("saveError"));
        return;
      }

      if (data) {
        const newCustomer: Customer = {
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          status: "active",
        };

        setCustomers((currentCustomers) => [
          newCustomer,
          ...currentCustomers,
        ]);
      }

      setName("");
      setPhone("");
      setEmail("");
      setShowForm(false);
    } catch (error) {
      console.error("Customer add error:", error);
      setError(t("addError"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(id: string) {
    const confirmed = window.confirm(t("deleteConfirm"));

    if (!confirmed) return;

    try {
      setError("");

      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Customer delete error:", deleteError);
        setError(t("deleteError"));
        return;
      }

      setCustomers((currentCustomers) =>
        currentCustomers.filter((customer) => customer.id !== id)
      );
    } catch (error) {
      console.error("Customer delete error:", error);
      setError(t("deleteError"));
    }
  }

  const activeCustomers = customers.filter(
    (customer) => customer.status === "active"
  );

  const inactiveCustomers = customers.filter(
    (customer) => customer.status === "inactive"
  );

  if (!isLoaded) {
    return (
      <main
        dir={isEnglish ? "ltr" : "rtl"}
        className="flex min-h-[calc(100vh-40px)] items-center justify-center rounded-[24px] bg-[#f8f8f8]"
      >
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-black" />
          {t("loading")}
        </div>
      </main>
    );
  }

  return (
    <main
      dir={isEnglish ? "ltr" : "rtl"}
      className="min-h-[calc(100vh-40px)] bg-[#f3f3f3] text-[#111]"
    >
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <header className="rounded-[24px] bg-white px-5 py-6 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:px-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                  <Users className="h-4 w-4" strokeWidth={1.8} />
                </div>

                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                  BusinessOS
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                {t("title")}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                {t("description")}
              </p>
            </div>

            <button
              onClick={() => setShowForm((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {t("addCustomer")}
                </>
              )}
            </button>
          </div>
        </header>

        <div className="mt-5 space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-2xl border border-red-100 bg-white p-4 text-sm text-red-600 shadow-[0_5px_25px_rgba(0,0,0,.03)]">
              {error}
            </div>
          )}

          {/* Add Customer */}
          {showForm && (
            <section className="rounded-[24px] bg-white p-5 shadow-[0_10px_45px_rgba(0,0,0,.05)] sm:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                    New Customer
                  </p>

                  <h2 className="mt-2 text-lg font-bold">
                    {t("newCustomer")}
                  </h2>

                  <p className="mt-1 text-xs text-neutral-500">
                    {t("newCustomerDescription")}
                  </p>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 text-neutral-400 transition hover:bg-neutral-100 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  label={t("customerName")}
                  value={name}
                  onChange={setName}
                  placeholder={t("namePlaceholder")}
                />

                <FormField
                  label={t("phone")}
                  value={phone}
                  onChange={setPhone}
                  placeholder={t("phonePlaceholder")}
                  type="tel"
                />

                <FormField
                  label={t("email")}
                  value={email}
                  onChange={setEmail}
                  placeholder={t("emailPlaceholder")}
                  type="email"
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={addCustomer}
                  disabled={saving}
                  className="h-11 rounded-xl bg-black px-6 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? t("saving") : t("saveCustomer")}
                </button>

                <button
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="h-11 rounded-xl border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
              </div>
            </section>
          )}

          {/* Statistics */}
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title={t("totalCustomers")}
              value={customers.length}
              icon={<Users className="h-4 w-4" />}
              type="black"
            />

            <StatCard
              title={t("activeCustomers")}
              value={activeCustomers.length}
              icon={<UserCheck className="h-4 w-4" />}
              type="green"
            />

            <StatCard
              title={t("inactiveCustomers")}
              value={inactiveCustomers.length}
              icon={<UserX className="h-4 w-4" />}
              type="gray"
            />
          </section>

          {/* Customer List */}
          <section className="overflow-hidden rounded-[24px] bg-white shadow-[0_10px_45px_rgba(0,0,0,.05)]">
            <div className="flex flex-col gap-4 border-b border-neutral-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
                  Customers
                </p>

                <h2 className="mt-2 text-lg font-bold">
                  {t("customerList")}
                </h2>

                <p className="mt-1 text-xs text-neutral-500">
                  {t("customerListDescription")}
                </p>
              </div>

              <div className="w-fit rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-600">
                {customers.length} {t("customerCount")}
              </div>
            </div>

            {customers.length === 0 ? (
              <div className="px-5 py-20 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                  <Users className="h-6 w-6" strokeWidth={1.6} />
                </div>

                <p className="mt-5 font-semibold">
                  {t("noCustomers")}
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  {t("noCustomersDescription")}
                </p>

                <button
                  onClick={() => setShowForm(true)}
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {t("addCustomer")}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table
                  className={`w-full min-w-[800px] ${
                    isEnglish ? "text-left" : "text-right"
                  }`}
                >
                  <thead>
                    <tr className="border-b border-neutral-100 bg-[#fafafa]">
                      <TableHead>{t("customer")}</TableHead>
                      <TableHead>{t("phone")}</TableHead>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("action")}</TableHead>
                    </tr>
                  </thead>

                  <tbody>
                    {customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-neutral-100 last:border-0 transition hover:bg-[#fafafa]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-xs font-bold text-white">
                              {customer.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <p className="text-sm font-semibold">
                                {customer.name}
                              </p>

                              <p className="mt-0.5 text-[10px] text-neutral-400">
                                {t("businessOSCustomer")}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          {customer.phone ? (
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <Phone className="h-3.5 w-3.5 text-neutral-400" />
                              <span dir="ltr">{customer.phone}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          {customer.email ? (
                            <div className="flex items-center gap-2 text-sm text-neutral-600">
                              <Mail className="h-3.5 w-3.5 text-neutral-400" />
                              <span>{customer.email}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                              customer.status === "active"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                customer.status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-neutral-400"
                              }`}
                            />

                            {customer.status === "active"
                              ? t("active")
                              : t("inactive")}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <button
                            onClick={() =>
                              deleteCustomer(customer.id)
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                            title={t("delete")}
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              strokeWidth={1.8}
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
      {children}
    </th>
  );
}

function StatCard({
  title,
  value,
  icon,
  type,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  type: "black" | "green" | "gray";
}) {
  const styles = {
    black: "bg-black text-white",
    green: "bg-emerald-50 text-emerald-600",
    gray: "bg-neutral-100 text-neutral-500",
  };

  return (
    <div className="rounded-[20px] bg-white p-5 shadow-[0_8px_35px_rgba(0,0,0,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,.07)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight">
            {value}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${styles[type]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold text-neutral-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black focus:ring-2 focus:ring-neutral-100"
      />
    </div>
  );
}