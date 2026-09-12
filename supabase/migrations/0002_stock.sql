-- Control de stock por medicamento (solo lo ve el cuidador)

alter table medications
  add column if not exists stock_quantity integer,
  add column if not exists low_stock_threshold integer not null default 5;

comment on column medications.stock_quantity is
  'Unidades restantes. NULL significa que no se lleva control de stock para este medicamento.';
comment on column medications.low_stock_threshold is
  'A partir de cuántas unidades restantes se avisa al cuidador de que quedan pocas.';
