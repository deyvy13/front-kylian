export type OpcionLista = { id: number; nombre: string; descripcion: string | null };

export type Trabajador = {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string;
  labor: string | null;
  fecha_creacion: string;
};

export type MetodoConsumo = "credito" | "efectivo" | "yape" | "deposito";
export type MetodoPago    = "efectivo" | "yape" | "deposito" | "descuento_salario";

export type Consumo = {
  id: number;
  id_trabajador: number | null;
  trabajador: string;
  dni: string | null;
  id_producto: number;
  producto: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  metodo_pago: MetodoConsumo;
  pagado: 0 | 1;
  id_pago: number | null;
  fecha_consumo: string;
};

export type Pago = {
  id: number;
  id_trabajador: number;
  trabajador: string;
  dni: string;
  metodo_pago: MetodoPago;
  monto: number;
  fecha_pago: string;
  consumos_pagados: number;
};

export type DeudaTrabajador = {
  id_trabajador: number;
  trabajador: string;
  dni: string;
  registros: number;
  total_deuda: number;
};

export type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  fecha_creacion: string;
};

export type Producto = {
  id: number;
  nombre: string;
  id_tipo_producto: number;
  tipo_producto: string;
  id_unidad_medida: number;
  unidad_medida: string;
  precio_compra: number;
  precio_venta: number;
  porcentaje_ganancia: number;
  ganancia_unitaria: number;
  stock_actual: number;
  fecha_creacion: string;
};

export type Movimiento = {
  id: number;
  id_producto: number;
  producto: string;
  tipo_movimiento: 1 | 2;
  tipo_movimiento_txt: "Entrada" | "Salida";
  cantidad: number;
  precio_unitario: number;
  motivo: string | null;
  fecha_movimiento: string;
};

export type DashboardResumen = {
  rango: { desde: string; hasta: string };
  kpis: {
    total_productos: number;
    stock_total: number;
    valor_inventario: number;
    entradas: number;
    salidas: number;
    ganancia_estimada: number;
  };
  serie: { fecha: string; entradas: number; salidas: number }[];
  por_tipo: { tipo: string; productos: number; stock: number }[];
};
