import aquara from '../assets/clientes/Logo-AQUARA.png';
import cmfc from '../assets/clientes/Logo-CMFC.png';
import delpa from '../assets/clientes/Logo-DELPA.png';
import ecel from '../assets/clientes/Logo-ECEL.png';
import hfp from '../assets/clientes/Logo-HFP.png';
import mrthree from '../assets/clientes/Logo-MRTHREE.png';
import santos from '../assets/clientes/Logo-SANTOS.png';
import traire from '../assets/clientes/Logo-TRAIRE.png';
import venmatic from '../assets/clientes/Logo-VENMATIC.png';
import vipe from '../assets/clientes/Logo-VIPE.png';
import finance from '../assets/photos/finance.jpg';
import audit from '../assets/photos/audit.jpg';
import advisory from '../assets/photos/advisory.jpg';

// Confirmed business identity and public contact channels.
export const company = {
  name: 'J&J CONSULTORES Y AUDITORES',
  descriptor: 'Consultoría empresarial',
  legalName: 'J&J CONSULTORES Y AUDITORES S.A.C.',
  email: 'jzavala@jjconsultores.pe',
  phone: '+51 956 481 871',
  contactIsExample: false,
  title: 'Auditoría y asesoría contable para MYPES en Perú | J&J CONSULTORES Y AUDITORES',
  description: 'Auditoría financiera y tributaria, outsourcing contable y gestión de planillas para MYPES en Perú. Conoce nuestro diagnóstico contable y tributario gratuito.',
};

export const navigation = [
  { label: 'Servicios', href: '#servicios' },
  { label: 'Nosotros', href: '#nosotros' },
  { label: 'Metodología', href: '#metodologia' },
  { label: 'Preguntas', href: '#preguntas' },
];

export const clients = [
  { name: 'AQUARA', image: aquara },
  { name: 'CMFC', image: cmfc },
  { name: 'DELPA', image: delpa },
  { name: 'ECEL', image: ecel },
  { name: 'HFP', image: hfp },
  { name: 'MRTHREE', image: mrthree },
  { name: 'SANTOS', image: santos },
  { name: 'TRAIRE', image: traire },
  { name: 'VENMATIC', image: venmatic },
  { name: 'VIPE', image: vipe },
];

export const featuredServices = [
  {
    number: '01',
    title: 'Outsourcing contable y financiero',
    description: 'Una gestión contable ordenada, información financiera útil y acompañamiento para las decisiones de tu empresa.',
    detail: 'Contabilidad que acompaña tu crecimiento',
    image: finance,
    alt: 'Computadora con gráficos financieros sobre un escritorio',
  },
  {
    number: '02',
    title: 'Auditoría financiera y tributaria',
    description: 'Una evaluación independiente para identificar riesgos, revisar controles y fortalecer la confianza en tu información.',
    detail: 'Una mirada independiente a tu negocio',
    image: audit,
    alt: 'Documentos contables y herramientas de cálculo sobre una mesa',
  },
  {
    number: '03',
    title: 'Gestión laboral y planillas',
    description: 'Remuneraciones, beneficios sociales, T-Registro y PLAME, con información sustentada y conciliada con tu contabilidad.',
    detail: 'Más orden en la gestión de tu equipo',
    image: advisory,
    alt: 'Revisión profesional de documentos en una reunión de trabajo',
  },
];

export const supportingServices = [
  { icon: 'layers', title: 'Procesos y control interno', description: 'Procedimientos más claros, trazables y eficientes. Menos reprocesos, más visibilidad.' },
  { icon: 'document', title: 'Regularización contable', description: 'Ordenamos atrasos, inconsistencias y declaraciones pendientes con prioridades concretas.' },
  { icon: 'screen', title: 'Consultoría en sistemas ERP', description: 'Conectamos tus procesos contables con herramientas que mejoran la calidad de la información.' },
];

export const process = [
  { title: 'Escuchamos tu negocio', description: 'Conocemos tu actividad, tus necesidades y el momento en el que se encuentra tu empresa.' },
  { title: 'Revisamos tu situación', description: 'Evaluamos la información contable, tributaria y documental para identificar puntos de atención.' },
  { title: 'Priorizamos las acciones', description: 'Te presentamos hallazgos claros y una ruta de trabajo según los riesgos y necesidades detectados.' },
  { title: 'Te acompañamos', description: 'Si decides continuar, definimos el alcance del servicio y trabajamos contigo en la implementación.' },
];

export const faqs = [
  { question: '¿Qué incluye el diagnóstico gratuito?', answer: 'Una evaluación inicial de la situación contable, tributaria y documental de tu empresa. Identificamos puntos de atención y prioridades para orientar un plan de acción. El alcance y la información necesaria se coordinan antes de la revisión.' },
  { question: '¿Trabajan con pequeñas y medianas empresas?', answer: 'Sí. Nuestra propuesta está orientada a MYPES en Perú, con experiencia de los socios en empresas de los sectores comercial, industrial y construcción. Adaptamos el alcance del servicio a la situación de cada negocio.' },
  { question: '¿Pueden ayudar si mi contabilidad está atrasada?', answer: 'Sí. El servicio de regularización permite revisar, ordenar y actualizar información contable, inconsistencias y declaraciones pendientes. Primero evaluamos el estado de la documentación para definir las acciones necesarias.' },
  { question: '¿Cómo se protege la información de mi empresa?', answer: 'La confidencialidad forma parte de nuestros valores de trabajo. Coordinamos el tratamiento de la información y las condiciones del servicio antes de recibir documentación empresarial.' },
  { question: '¿Tengo que contratar un servicio después del diagnóstico?', answer: 'El diagnóstico gratuito es el primer paso para conocer tu situación. Si deseas continuar, se define una propuesta de servicio con un alcance específico. Puedes evaluar esa propuesta antes de tomar una decisión.' },
];
