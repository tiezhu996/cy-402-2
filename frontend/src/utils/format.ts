import dayjs from "dayjs";

export function formatDate(value?: string | null): string {
  return value ? dayjs(value).format("YYYY-MM-DD") : "-";
}

export function formatDateTime(value?: string | null): string {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";
}

export function formatMoney(value: string | number | undefined): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

