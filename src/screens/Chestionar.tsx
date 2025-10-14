import { ScrollView, StyleSheet, Text, View, Pressable, TextInput } from 'react-native';
import React, { useState } from 'react';
import { getFirestore, doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import Intrebari from '../comp/Intrebari';
import * as Progress from 'react-native-progress';

const Chestionar = () => {
  const navigation = useNavigation();
  const db = getFirestore();
  const authInstance = getAuth();
  const userId = authInstance.currentUser?.uid;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[] | string>>({});
  const [error, setError] = useState<string | null>(null);
  const handleNext = () => {
    if (!Intrebari[currentQuestionIndex]) {return;}
    const question = Intrebari[currentQuestionIndex];
    const value = answers[question.id.toString()];
    if (!navigation) {
      console.error('err, navigator indisponibil');
      return;
    }
    if (question.validation && typeof value === 'string') {
      const validationError = question.validation(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError(null);
    let nextIndex = currentQuestionIndex + 1;
    if (question.id === 7 && value === 'Nu') {
      setAnswers((prev) => {
        const updatedAnswers = { ...prev };
        delete updatedAnswers['8'];
        return updatedAnswers;
      });
      if (Intrebari[nextIndex]?.id === 8) {
        nextIndex++;
      }
    }
    if (nextIndex >= Intrebari.length) {
      handleSubmit();
      return;
    }
    setCurrentQuestionIndex(nextIndex);
  };

  const handleAnswer = (value: string) => {
    const currentQuestion = Intrebari[currentQuestionIndex];
    if (currentQuestion.type === 'checkbox') {
      setAnswers((prev) => {
        const currentValues = Array.isArray(prev[currentQuestion.id.toString()])
          ? [...(prev[currentQuestion.id.toString()] as string[])]
          : [];
        if (currentValues.includes(value)) {
          return { ...prev, [currentQuestion.id.toString()]: currentValues.filter((item) => item !== value) };
        } else {
          return { ...prev, [currentQuestion.id.toString()]: [...currentValues, value] };
        }
      });
    } else {
      setAnswers((prev) => ({ ...prev, [Intrebari[currentQuestionIndex]?.id.toString() || '']: value }));
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      console.log('uid nedisponibil');
      return;
    }
    const dataToSave: Record<string, any> = { ...answers, uid: userId, data_compl: serverTimestamp() };
    if (dataToSave['8'] === '') {
      delete dataToSave['8'];
    }
      try {
        await setDoc(doc(collection(db, 'Chestionar'), userId), dataToSave);
        console.log('chestionar ok');
      } catch (err) {
        console.error('err- salvare:', err);
      }

      const stepsGoal = (() => {
        if (dataToSave['5'] === 'Sedentar (<7.500 de pași/zi)') {
          if (dataToSave['6'] === 'Scădere în greutate') {return 6000;}
          if (dataToSave['6'] === 'Menținere' || dataToSave['6'] === 'Creștere în greutate') {return 5000;}
          return 6500;
        }
        if (dataToSave['5'] === 'Activ moderat (7.500 - 9.999 de pași/zi)') {
          if (dataToSave['6'] === 'Scădere în greutate') {return 8000;}
          if (dataToSave['6'] === 'Menținere' || dataToSave['6'] === 'Creștere în greutate') {return 7500;}
          return 9000;
        }
        if (dataToSave['5'] === 'Activ (10.000 - 12.499 de pași/zi)') {
          if (dataToSave['6'] === 'Scădere în greutate') {return 10000;}
          if (dataToSave['6'] === 'Menținere' || dataToSave['6'] === 'Creștere în greutate') {return 9500;}
          return 11000;
        }
        if (dataToSave['5'] === 'Foarte activ (≥12.500 de pași/zi)') {
          if (dataToSave['6'] === 'Menținere' || dataToSave['6'] === 'Creștere în greutate') {return 12000;}
          return 13000;
        }
        return 10000;
  })();
        dataToSave.steps_goal = stepsGoal;
        try{
          await setDoc(doc(db, 'health_metrics', userId), {
            steps_goal: stepsGoal,
            uid: userId,
            date: new Date().toISOString(),
          }, { merge: true });
          console.log('steps_goal- health_metrics');
        }
        catch(err){
          console.error('err- salvare:', err);
        }
  };

  const progress = (currentQuestionIndex + 1) / Intrebari.length;
  const question = Intrebari[currentQuestionIndex];
  if (!question) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Progress.Bar progress={progress} width={null} height={8} color="#1C4B82" style={styles.progressBar} />

      <Text style={styles.question}>{question.question}</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      {question.type === 'radio' && question.options && (
        <View>
          {question.options.map((option, index) => (
            <Pressable
              key={index}
              style={[
                styles.option,
                answers[question.id.toString()] === option && styles.selectedOption,
              ]}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {question.type === 'checkbox' && question.options && (
        <ScrollView style={styles.checkboxContainer}>
          {question.options.map((option, index) => (
            <Pressable
              key={index}
              style={[
                styles.checkboxOption,
                (answers[question.id.toString()] as string[])?.includes(option) && styles.selectedOption,
              ]}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {question.type === 'input' && (
        <TextInput
          style={styles.input}
          keyboardType={question.inputType === 'numeric' ? 'numeric' : 'default'}
          value={answers[question.id.toString()] as string || ''}
          onChangeText={handleAnswer}
        />
      )}

      <Pressable style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>
          {currentQuestionIndex === Intrebari.length - 1 ? 'Finalizare' : 'Următoarea'}
        </Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 20, justifyContent: 'center' },
  progressBar: { marginBottom: 20 },
  question: { fontSize: 20, fontWeight: 'bold', color: '#1C4B82', marginBottom: 10 },
  error: { color: 'red', marginBottom: 10 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#1C4B82',
    borderRadius: 10,
    marginVertical: 4,
    alignItems: 'center',
  },
  checkboxContainer: {
    maxHeight: 300,
    marginBottom: 10,
  },
  checkboxOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 2,
    borderColor: '#1C4B82',
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  selectedOption: { backgroundColor: '#1C4B82', borderColor: '#1C4B82' },
  optionText: { fontSize: 16, color: '#000', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#1C4B82',
    borderRadius: 12,
    padding: 10,
    fontSize: 16,
    marginTop: 10,
  },
  button: {
    backgroundColor: '#1C4B82',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default Chestionar;
