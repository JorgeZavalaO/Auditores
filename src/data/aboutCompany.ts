// Adapted from the supplied Word's Who We Are, Mission, Vision and Values sections.
// The incomplete company introduction does not establish a founding date or firm age.
export const aboutCompany = {
  sourceDocument: 'IINFORMACIÓN PARA PÁGINA WEB J&J AUDITORES.docx',
  name: 'J&J CONSULTORES Y AUDITORES',
  legalName: 'J&J CONSULTORES Y AUDITORES S.A.C.',
  country: 'Perú',
  partnerExperienceYears: 20,
  sectors: ['Comercial', 'Industrial', 'Construcción'],
  story: [
    'Somos una empresa peruana que acompaña a las MYPES en la gestión de su negocio. Combinamos experiencia profesional con una relación directa, clara y cercana.',
    'Nuestros socios cuentan con 20 años de experiencia en los sectores comercial, industrial y construcción. Esa trayectoria profesional aporta contexto para comprender la información, identificar riesgos y orientar decisiones.',
    'Nuestra forma de trabajar se apoya en la integridad, la prevención y la confidencialidad. Explicamos la información contable y tributaria de manera sencilla para que cada empresa pueda entender su situación y decidir con criterio.',
  ],
  mission: 'Brindar servicios integrales de contabilidad, asesoría tributaria, outsourcing contable, gestión financiera y cumplimiento empresarial para MYPES peruanas. Trabajamos con información precisa, tecnología, prevención y acompañamiento cercano para prevenir contingencias, optimizar recursos y generar confianza. Nuestro compromiso es convertir la gestión contable en una herramienta para el crecimiento y la rentabilidad de cada negocio.',
  vision: 'Ser el estudio contable referente para las MYPES del Perú, reconocido por brindar confianza, innovación y atención personalizada. Aspiramos a impulsar el crecimiento sostenible de nuestros clientes mediante soluciones contables, tributarias y financieras estratégicas, que les permitan tomar mejores decisiones, reducir riesgos y competir con éxito.',
  ceo: {
    name: 'Jorge Luis Zavala Félix',
    designation: 'CEO',
    credentials: ['Contador Público Colegiado', 'Auditor Independiente'],
    imageAlt: 'Jorge Luis Zavala Félix, CEO de J&J Consultores y Auditores',
    biography: [
      'Profesional con más de 20 años de trayectoria en gestión contable, financiera y asesoría tributaria para los sectores comercial, industrial, construcción y servicios.',
      'Auditor independiente con más de 5 años de experiencia en auditoría financiera, tributaria y de control interno.',
      'Especialista en liderazgo de equipos contables, gestión estratégica y optimización de procesos empresariales. Su enfoque integra excelencia técnica, ética profesional y visión de negocio para fortalecer la gestión y el crecimiento de las organizaciones.',
    ],
  },
  values: [
    { title: 'Integridad', description: 'Actuamos con honestidad, transparencia, responsabilidad y ética profesional. Cuidamos la confianza que cada cliente deposita en nosotros.', icon: 'shield' },
    { title: 'Excelencia', description: 'Buscamos hacer bien las cosas y mejorar continuamente nuestros conocimientos, procesos y herramientas, tanto técnicos como tecnológicos.', icon: 'check' },
    { title: 'Compromiso', description: 'Nos involucramos con los objetivos de nuestros clientes y asumimos cada encargo con responsabilidad, oportunidad y sentido de urgencia.', icon: 'document' },
    { title: 'Prevención', description: 'Analizamos la información, identificamos riesgos y proponemos acciones preventivas, sin esperar a que aparezca un problema.', icon: 'shield' },
    { title: 'Confidencialidad', description: 'Protegemos la información contable, financiera, tributaria y empresarial de nuestros clientes con responsabilidad profesional.', icon: 'shield' },
    { title: 'Cercanía', description: 'Construimos una relación directa, clara y humana. Explicamos la contabilidad y los impuestos de manera sencilla para entender y decidir.', icon: 'plus' },
    { title: 'Innovación', description: 'Utilizamos tecnología y herramientas digitales para hacer más eficientes los procesos contables, administrativos y financieros.', icon: 'screen' },
    { title: 'Orientación a resultados', description: 'Nuestro trabajo va más allá de una declaración o un reporte. Buscamos que nuestra asesoría aporte valor real a cada negocio.', icon: 'layers' },
  ],
} as const;
