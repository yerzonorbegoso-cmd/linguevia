import { CefrLevel } from '@/types/database';

export interface GuidedConversationTopic {
  id: string;
  level: CefrLevel;
  category: string;
  titleEs: string;
  promptEs: string;
  promptEn: string;
  keyVocabulary: string[];
}

export const GUIDED_CONVERSATION_TOPICS: GuidedConversationTopic[] = [
  {
    id: 'topic-a1-routine',
    level: 'A1',
    category: 'Vida cotidiana',
    titleEs: 'Rutina matutina y hábitos diarios',
    promptEs: '¿Cómo empieza tu día ideal y qué bebida no puede faltar en tu mañana?',
    promptEn: 'How does your ideal day start, and what drink is essential in your morning?',
    keyVocabulary: ['despertarse / wake up', 'desayunar / have breakfast', 'temprano / early'],
  },
  {
    id: 'topic-a2-travel',
    level: 'A2',
    category: 'Viajes y cultura',
    titleEs: 'Un viaje inolvidable o ciudad soñada',
    promptEs: 'Describe el lugar más interesante que has visitado o el próximo país al que te gustaría viajar.',
    promptEn: 'Describe the most interesting place you have visited or the next country you would like to visit.',
    keyVocabulary: ['alojamiento / accommodation', 'costumbre / custom', 'recuerdo / souvenir'],
  },
  {
    id: 'topic-b1-food',
    level: 'B1',
    category: 'Gastronomía',
    titleEs: 'Tradiciones culinarias de tu país',
    promptEs: '¿Qué plato tradicional de tu región prepararías para un amigo extranjero y cuál es su historia?',
    promptEn: 'What traditional dish from your region would you cook for a foreign friend, and what is its story?',
    keyVocabulary: ['ingredientes frescos / fresh ingredients', 'receta casera / homemade recipe', 'sabor / flavor'],
  },
  {
    id: 'topic-b2-work',
    level: 'B2',
    category: 'Trabajo y tecnología',
    titleEs: 'El futuro del trabajo remoto e internacional',
    promptEs: '¿Cuáles son las mayores ventajas y desafíos de trabajar con equipos multiculturales en distintas zonas horarias?',
    promptEn: 'What are the biggest advantages and challenges of working with multicultural teams across timezones?',
    keyVocabulary: ['conciliación / work-life balance', 'productividad / productivity', 'huso horario / timezone'],
  },
  {
    id: 'topic-c1-society',
    level: 'C1',
    category: 'Sociedad e idiomas',
    titleEs: 'Cómo cambia nuestra personalidad al hablar otro idioma',
    promptEs: '¿Sientes que tu forma de expresarte o tu sentido del humor cambian cuando hablas en tu segundo idioma?',
    promptEn: 'Do you feel that your way of expressing yourself or sense of humor changes when speaking your second language?',
    keyVocabulary: ['matiz / nuance', 'identidad cultural / cultural identity', 'fluidez / fluency'],
  },
];

export interface TranslationAdapterResult {
  configured: boolean;
  success: boolean;
  translatedText?: string;
  provider?: string;
  quotaRemaining?: number;
  errorMessage?: string;
}
