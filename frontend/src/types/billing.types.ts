export interface ConfiguracionFiscal {
  id?:              number;
  sede:             number;
  sede_name?:       string;
  nombre_comercial: string;
  nombre_legal:     string;
  rfc:              string;
  direccion:        string;
  telefono:         string;
  email:            string;
  logo_url:         string;
  leyenda_ticket:   string;
  updated_at?:      string;
}
