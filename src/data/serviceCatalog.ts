export interface CatalogService {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  summary: string;
  scope: string[];
  value: string;
  freeDiagnosis?: boolean;
}

export const serviceCatalog: CatalogService[] = [
  {
    id: 'auditoria',
    title: 'Auditoría financiera y tributaria',
    shortTitle: 'Auditoría',
    icon: 'shield',
    summary: 'Evaluamos de manera independiente la razonabilidad de la información financiera y la efectividad de los principales controles de la organización.',
    scope: ['Revisión de información financiera y situación tributaria.', 'Evaluación de controles, riesgos y documentación de sustento.'],
    value: 'Una perspectiva que permite identificar debilidades de control, riesgos y oportunidades de mejora, más allá de una opinión sobre los números.',
  },
  {
    id: 'outsourcing',
    title: 'Outsourcing contable y financiero',
    shortTitle: 'Outsourcing',
    icon: 'document',
    summary: 'Asumimos integralmente la gestión contable de tu empresa mediante un modelo de externalización especializado, flexible y escalable.',
    scope: ['Gestión contable y preparación de información financiera.', 'Acompañamiento especializado según las necesidades del negocio.'],
    value: 'Respaldo profesional sin mantener una estructura interna completa, para concentrar recursos en la actividad principal de tu empresa.',
  },
  {
    id: 'planillas',
    title: 'Gestión laboral y administración de planillas',
    shortTitle: 'Gestión laboral',
    icon: 'layers',
    summary: 'Gestionamos remuneraciones, beneficios sociales, contratos laborales, T-Registro, PLAME y obligaciones vinculadas a los trabajadores.',
    scope: ['Administración de planillas y documentación laboral.', 'Controles preventivos, sustento y conciliación con la contabilidad.'],
    value: 'Información laboral ordenada y sustentada para atender obligaciones y reducir contingencias laborales y tributarias.',
  },
  {
    id: 'procesos',
    title: 'Implementación y optimización de procesos contables',
    shortTitle: 'Procesos contables',
    icon: 'layers',
    summary: 'Diseñamos, implementamos, revisamos y mejoramos procedimientos contables, administrativos y de control interno.',
    scope: ['Diseño e implementación de procedimientos de trabajo.', 'Revisión de controles y oportunidades de optimización.'],
    value: 'Procesos orientados a reducir reprocesos, errores y tareas manuales, con mayor trazabilidad de la información para acompañar el crecimiento.',
  },
  {
    id: 'regularizacion',
    title: 'Regularización contable y tributaria',
    shortTitle: 'Regularización',
    icon: 'document',
    summary: 'Ordenamos, actualizamos y reconstruimos información contable de empresas que presentan atrasos, inconsistencias o declaraciones pendientes.',
    scope: ['Organización y actualización de información contable y tributaria.', 'Procedimientos y controles para prevenir la recurrencia de inconsistencias.'],
    value: 'Una base documental más ordenada y una ruta para atender pendientes, sin perder de vista las causas que los originaron.',
  },
  {
    id: 'erp',
    title: 'Consultoría en sistemas de gestión contable (ERP)',
    shortTitle: 'Sistemas ERP',
    icon: 'screen',
    summary: 'Asesoramos en la organización y optimización de procesos contables mediante sistemas ERP y herramientas tecnológicas de gestión.',
    scope: ['Organización de procesos contables mediante tecnología.', 'Optimización de información y reportes financieros para la gerencia.'],
    value: 'Tecnología y experiencia contable para reducir tareas manuales y mejorar la calidad de la información utilizada en la gestión.',
  },
  {
    id: 'diagnostico',
    title: 'Diagnóstico contable y tributario',
    shortTitle: 'Diagnóstico gratuito',
    icon: 'check',
    summary: 'Realizamos una evaluación integral de la situación contable, tributaria y documental de tu empresa.',
    scope: ['Evaluación del nivel de cumplimiento y clasificación de riesgos.', 'Plan de acción con prioridades concretas para atender contingencias.'],
    value: 'Un punto de partida para comprender la situación actual y decidir qué acciones necesitan atención primero.',
    freeDiagnosis: true,
  },
];
