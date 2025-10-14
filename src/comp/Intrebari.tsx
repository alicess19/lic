export type QuestionType = {
    id: number;
    question: string;
    type: 'radio' | 'input' | 'checkbox';
    options?: string[];
    inputType?: 'numeric' | 'text';
    conditional?: { dependsOn: number; value: string };
    validation?: (value: string) => string | null;
};

const Intrebari: QuestionType[] = [
    {
        id: 0,
        question: 'Cum vă numiți? 🫱🏼‍🫲🏿',
        type: 'input',
        inputType: 'text',
        validation: (value) => {
            if (!/^[a-zA-ZăîâșțĂÎÂȘȚ ]{2,}$/.test(value)) {
                return 'Introduceți un nume valid, vă rugăm.';
            }
            return null;
        },
    },
    {
        id: 1,
        question: 'Care este sexul dumneavoastră?',
        type: 'radio',
        options: ['Masculin', 'Feminin', 'Prefer să nu răspund'],
    },
    {
        id: 2,
        question: 'Care este vârsta dumneavoastră?',
        type: 'input',
        inputType: 'numeric',
        validation: (value) => {
            const age = parseInt(value, 10);
            if (isNaN(age) || age < 13) {
                return 'Ne cerem scuze, aplicația nu este destinată persoanelor sub 13 ani. 🫤';
            }
            return null;
        },
    },
    {
        id: 3,
        question: 'Măsurători necesare: înălțime(cm)-',
        type: 'input',
        inputType: 'numeric',
        validation: (value) => {
            const height = parseInt(value, 10);
            if (isNaN(height) || height < 60 || height > 250) {
                return 'Vă rugăm să introduceți o valoare validă!🛎️';
            }
            return null;
        },
    },
    {
        id: 4,
        question: 'Măsurători necesare: greutate(kg)-',
        type: 'input',
        inputType: 'numeric',
        validation: (value) => {
            const weight = parseInt(value, 10);
            if (isNaN(weight) || weight < 2 || weight > 635) {
                return 'Vă rugăm să introduceți o valoare validă!🛎️';
            }
            return null;
        },
    },
    {
        id: 5,
        question: 'Cât de activ vă considerați în acest moment?',
        type: 'radio',
        options: [
            'Sedentar (<7.500 de pași/zi)',
            'Activ moderat (7.500 - 9.999 de pași/zi)',
            'Activ (10.000 - 12.499 de pași/zi)',
            'Foarte activ (≥12.500 de pași/zi)',
        ],
    },
    {
        id: 6,
        question: 'Care este obiectivul dumneavoastră?',
        type: 'radio',
        options: ['Scădere în greutate', 'Menținere', 'Creștere în greutate', 'Tonifiere'],
    },
    {
        id: 7,
        question: 'Aveți cumva alergii la anumite alimente?',
        type: 'radio',
        options: ['Da', 'Nu'],
    },
    {
        id: 8,
        question: 'Selectați alergenii:',
        type: 'checkbox',
        options: [
            'Cereale cu gluten (grâu, orz, ovăz, secară)',
            'Crustacee',
            'Ouă',
            'Pește',
            'Arahide',
            'Soia',
            'Lapte și lactate',
            'Fructe cu coajă (migdale, alune, nuci, fistic, macadamia)',
            'Țelină',
            'Muștar',
            'Susan',
            'Dioxid de sulf și sulfiți',
            'Lupin',
            'Moluște',
        ],
        conditional: { dependsOn: 7, value: 'Da' },
    },
    {
        id: 9,
        question: 'Sunteți vegetarian?',
        type: 'radio',
        options: ['Da', 'Nu'],
    },
    {
        id: 10,
        question: 'Măsurători necesare BMR: circumferința gâtului(cm)-',
        type: 'input',
        inputType: 'numeric',
        validation: (value) => {
            const neck = parseFloat(value);
            if (isNaN(neck) || neck < 20 || neck > 80) {
                return 'Vă rugăm să introduceți o valoare validă!';
            }
            return null;
        },
    },
    {
        id: 11,
        question: 'Măsurători necesare: circumferința taliei(cm)-',
        type: 'input',
        inputType: 'numeric',
        validation: (value) => {
            const waist = parseFloat(value);
            if (isNaN(waist) || waist < 40 || waist > 200) {
                return 'Vă rugăm să introduceți o valoare validă!';
            }
            return null;
        },
    },
    {
        id: 12,
        question: 'Măsurători necesare: circumferința șoldurilor(cm)-',
        type: 'input',
        inputType: 'numeric',
        validation: (value) => {
            const hips = parseFloat(value);
            if (isNaN(hips) || hips < 50 || hips > 200) {
                return 'Vă rugăm să introduceți o valoare validă!';
            }
            return null;
        },
    },
];

export default Intrebari;
