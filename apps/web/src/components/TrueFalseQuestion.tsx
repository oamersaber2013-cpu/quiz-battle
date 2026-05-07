"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { GameStatus, ClientQuestion } from "@quiz-battle/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// TRUE/FALSE QUESTION COMPONENT - Alternative question type with two choices
// ═══════════════════════════════════════════════════════════════════════════════

interface TrueFalseQuestionProps {
  question: ClientQuestion;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: number | null;
  lastAnswerResult: { correct: boolean; correctIndex: number } | null;
  language: "en" | "ar";
  themeColor?: string;
  onAnswer: (index: number) => void;
}

const TRANSLATIONS = {
  en: {
    true: "TRUE",
    false: "FALSE",
    selectAnswer: "Select your answer",
    correct: "Correct!",
    wrong: "Wrong!",
    timeRemaining: "Time remaining",
  },
  ar: {
    true: "صحيح",
    false: "خطأ",
    selectAnswer: "اختر إجابتك",
    correct: "صحيح!",
    wrong: "خطأ!",
    timeRemaining: "الوقت المتبقي",
  },
};

export function TrueFalseQuestion({
  question,
  status,
  timeLeft,
  selectedAnswer,
  lastAnswerResult,
  language,
  themeColor = "#8b5cf6",
  onAnswer,
}: TrueFalseQuestionProps) {
  const isAr = language === "ar";
  const t = TRANSLATIONS[language];
  
  const hasAnswered = selectedAnswer !== null;
  const isRevealing = status === GameStatus.Results && lastAnswerResult !== null;
  
  // True = index 0, False = index 1
  const handleTrue = useCallback(() => {
    if (!hasAnswered && status === GameStatus.Question) {
      onAnswer(0);
    }
  }, [hasAnswered, status, onAnswer]);
  
  const handleFalse = useCallback(() => {
    if (!hasAnswered && status === GameStatus.Question) {
      onAnswer(1);
    }
  }, [hasAnswered, status, onAnswer]);

  const getButtonState = (isTrueButton: boolean) => {
    const buttonIndex = isTrueButton ? 0 : 1;
    
    if (!isRevealing) {
      // During question phase
      if (selectedAnswer === buttonIndex) {
        return "selected";
      }
      return hasAnswered ? "disabled" : "default";
    }
    
    // During reveal phase
    const isCorrectAnswer = lastAnswerResult?.correctIndex === buttonIndex;
    const isSelected = selectedAnswer === buttonIndex;
    
    if (isCorrectAnswer) {
      return "correct";
    }
    if (isSelected && !isCorrectAnswer) {
      return "wrong";
    }
    return "faded";
  };

  const getButtonStyles = (state: string) => {
    switch (state) {
      case "selected":
        return {
          background: `linear-gradient(135deg, ${themeColor}40, ${themeColor}20)`,
          borderColor: themeColor,
          boxShadow: `0 0 30px ${themeColor}60`,
          transform: "scale(1.02)",
        };
      case "correct":
        return {
          background: "linear-gradient(135deg, #22c55e40, #22c55e20)",
          borderColor: "#22c55e",
          boxShadow: "0 0 40px #22c55e80",
          transform: "scale(1.05)",
        };
      case "wrong":
        return {
          background: "linear-gradient(135deg, #ef444440, #ef444420)",
          borderColor: "#ef4444",
          boxShadow: "0 0 30px #ef444460",
          animation: "shake 0.5s ease-in-out",
        };
      case "faded":
        return {
          opacity: 0.3,
          background: "rgba(75,85,99,0.2)",
          borderColor: "rgba(75,85,99,0.3)",
        };
      case "disabled":
        return {
          opacity: 0.5,
          cursor: "not-allowed",
          background: "rgba(75,85,99,0.1)",
        };
      default:
        return {
          background: "rgba(31,41,55,0.8)",
          borderColor: "rgba(75,85,99,0.5)",
        };
    }
  };

  const trueState = getButtonState(true);
  const falseState = getButtonState(false);
  const trueStyles = getButtonStyles(trueState);
  const falseStyles = getButtonStyles(falseState);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Timer */}
      <div className="mb-6">
        <div className="flex justify-center items-center gap-2 mb-2">
          <span className={`text-4xl font-black ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ 
              background: `linear-gradient(90deg, ${themeColor}, ${themeColor}80)`,
            }}
            initial={{ width: "100%" }}
            animate={{ width: `${(timeLeft / (question?.timeLimit || 15)) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/80 backdrop-blur-md rounded-3xl p-6 mb-6 border-2"
        style={{ borderColor: themeColor + "40" }}
      >
        <div className="text-center mb-8">
          <span 
            className="inline-block px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
            style={{ background: themeColor + "30", color: themeColor }}
          >
            {question.category}
          </span>
          <h2 className="text-xl md:text-2xl font-bold leading-relaxed">
            {question.text}
          </h2>
          <p className="text-gray-500 mt-4 text-sm">
            {isAr ? "اختر صحيح أو خطأ" : "Choose True or False"}
          </p>
        </div>

        {/* True/False Buttons */}
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          {/* TRUE Button */}
          <motion.button
            whileHover={!hasAnswered && status === GameStatus.Question ? { scale: 1.02 } : {}}
            whileTap={!hasAnswered && status === GameStatus.Question ? { scale: 0.98 } : {}}
            onClick={handleTrue}
            disabled={hasAnswered || status !== GameStatus.Question}
            className={`
              relative p-6 md:p-8 rounded-2xl border-4 transition-all duration-300
              flex flex-col items-center justify-center gap-3
              ${hasAnswered && selectedAnswer !== 0 ? "cursor-not-allowed" : ""}
            `}
            style={{
              ...trueStyles,
              minHeight: "160px",
            }}
          >
            {/* Icon */}
            <motion.div
              animate={trueState === "correct" ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              } : {}}
              transition={{ duration: 0.5 }}
              className="text-6xl md:text-7xl"
            >
              {trueState === "correct" ? "✅" : trueState === "wrong" ? "❌" : "👍"}
            </motion.div>
            
            {/* Label */}
            <span className="text-2xl md:text-3xl font-black tracking-wider">
              {t.true}
            </span>
            
            {/* Subtitle */}
            <span className="text-sm text-gray-400">
              {isAr ? "الإجابة صحيحة" : "The statement is true"}
            </span>

            {/* Glow Effect for Selected */}
            {trueState === "selected" && (
              <div 
                className="absolute inset-0 rounded-2xl -z-10 animate-pulse"
                style={{
                  background: `radial-gradient(circle at center, ${themeColor}30, transparent)`,
                }}
              />
            )}

            {/* Result Indicator */}
            {isRevealing && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: trueState === "correct" ? "#22c55e" : trueState === "wrong" ? "#ef4444" : "transparent",
                  boxShadow: trueState === "correct" ? "0 0 20px #22c55e" : trueState === "wrong" ? "0 0 20px #ef4444" : "none",
                }}
              >
                {trueState === "correct" && "✓"}
                {trueState === "wrong" && "✗"}
              </motion.div>
            )}
          </motion.button>

          {/* FALSE Button */}
          <motion.button
            whileHover={!hasAnswered && status === GameStatus.Question ? { scale: 1.02 } : {}}
            whileTap={!hasAnswered && status === GameStatus.Question ? { scale: 0.98 } : {}}
            onClick={handleFalse}
            disabled={hasAnswered || status !== GameStatus.Question}
            className={`
              relative p-6 md:p-8 rounded-2xl border-4 transition-all duration-300
              flex flex-col items-center justify-center gap-3
              ${hasAnswered && selectedAnswer !== 1 ? "cursor-not-allowed" : ""}
            `}
            style={{
              ...falseStyles,
              minHeight: "160px",
            }}
          >
            {/* Icon */}
            <motion.div
              animate={falseState === "correct" ? { 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0]
              } : {}}
              transition={{ duration: 0.5 }}
              className="text-6xl md:text-7xl"
            >
              {falseState === "correct" ? "✅" : falseState === "wrong" ? "❌" : "👎"}
            </motion.div>
            
            {/* Label */}
            <span className="text-2xl md:text-3xl font-black tracking-wider">
              {t.false}
            </span>
            
            {/* Subtitle */}
            <span className="text-sm text-gray-400">
              {isAr ? "الإجابة خاطئة" : "The statement is false"}
            </span>

            {/* Glow Effect for Selected */}
            {falseState === "selected" && (
              <div 
                className="absolute inset-0 rounded-2xl -z-10 animate-pulse"
                style={{
                  background: `radial-gradient(circle at center, ${themeColor}30, transparent)`,
                }}
              />
            )}

            {/* Result Indicator */}
            {isRevealing && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: falseState === "correct" ? "#22c55e" : falseState === "wrong" ? "#ef4444" : "transparent",
                  boxShadow: falseState === "correct" ? "0 0 20px #22c55e" : falseState === "wrong" ? "0 0 20px #ef4444" : "none",
                }}
              >
                {falseState === "correct" && "✓"}
                {falseState === "wrong" && "✗"}
              </motion.div>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Result Banner */}
      {isRevealing && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`
            p-4 rounded-2xl text-center font-bold text-lg
            ${lastAnswerResult?.correct 
              ? "bg-green-500/20 border-2 border-green-500 text-green-400" 
              : "bg-red-500/20 border-2 border-red-500 text-red-400"
            }
          `}
        >
          {lastAnswerResult?.correct ? (
            <span className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              {t.correct}
              <span className="text-2xl">🎉</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="text-2xl">😔</span>
              {t.wrong}
              <span className="text-2xl">😔</span>
            </span>
          )}
        </motion.div>
      )}

      {/* Shake Animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

export default TrueFalseQuestion;
