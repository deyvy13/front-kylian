import type { MetodoConsumo, MetodoPago } from "@/core/types";

export const LABEL_METODO: Record<MetodoConsumo | MetodoPago, string> = {
  credito:            "Crédito",
  efectivo:           "Efectivo",
  yape:               "Yape",
  deposito:           "Depósito",
  descuento_salario:  "Desc. salario",
};

export const CHIP_METODO: Record<MetodoConsumo | MetodoPago, string> = {
  credito:            "bg-[color:var(--warning)]/15 text-[color:var(--warning)]",
  efectivo:           "bg-[color:var(--success)]/15 text-[color:var(--success)]",
  yape:               "bg-[#7c3aed]/15 text-[#7c3aed]",
  deposito:           "bg-[color:var(--primary)]/15 text-[color:var(--primary)]",
  descuento_salario:  "bg-[#0891b2]/15 text-[#0891b2]",
};
