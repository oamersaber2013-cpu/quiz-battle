"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";

interface AudioQuestionProps {
  question: any;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: number | null;
  lastAnswerResult: any;
  language: "en" | "ar";
  onAnswer: (index: number) => void;
}

export function AudioQuestion({
  question,
  status,
  selectedAnswer,
  lastAnswerResult,
  language,
  onAnswer,
}: AudioQuestionProps) {
  const isAr = language === "ar";
  const hasAnswered = selectedAnswer !== null;
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const text = isAr ? question.textAr || question.text : question.textEn || question.text;
  const options = isAr
    ? question.optionsAr || question.options
    : question.optionsEn || question.options;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="w-full">
      {/* Question Text */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-4">
        <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
          {text}
        </p>
      </div>

      {/* Audio Player */}
      {question.audioUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <audio
            ref={audioRef}
            src={question.audioUrl}
            onEnded={handleAudioEnded}
            className="hidden"
          />
          <button
            onClick={togglePlay}
            className="w-full p-6 rounded-2xl border-2 border-amber-500/50 bg-gray-900 hover:bg-gray-800 transition-all flex items-center justify-center gap-4"
          >
            <motion.div
              animate={isPlaying ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-4xl"
            >
              {isPlaying ? "🔊" : "▶️"}
            </motion.div>
            <span className="text-lg font-bold text-white">
              {isPlaying
                ? isAr
                  ? "جاري التشغيل..."
                  : "Playing..."
                : isAr
                  ? "اضغط للاستماع"
                  : "Tap to Listen"}
            </span>
            {isPlaying && (
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 24, 8] }}
                    transition={{
                      repeat: Infinity,
                      duration: 0.6,
                      delay: i * 0.2,
                    }}
                    className="w-1.5 bg-amber-500 rounded-full"
                  />
                ))}
              </div>
            )}
          </button>
        </motion.div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(options || []).map((option: string, index: number) => {
          const selected = selectedAnswer === index;
          const isCorrect = question.correctAnswer === index;
          const showResult = status === GameStatus.AnswerReveal || lastAnswerResult;

          let borderColor = "border-gray-700";
          let bgColor = "bg-gray-800";
          let textColor = "text-white";

          if (showResult) {
            if (isCorrect) {
              borderColor = "border-emerald-500";
              bgColor = "bg-emerald-500/20";
              textColor = "text-emerald-400";
            } else if (selected && !isCorrect) {
              borderColor = "border-rose-500";
              bgColor = "bg-rose-500/20";
              textColor = "text-rose-400";
            }
          } else if (selected) {
            borderColor = "border-amber-500";
            bgColor = "bg-amber-500/20";
            textColor = "text-amber-400";
          }

          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={!hasAnswered && !showResult ? { scale: 1.02 } : {}}
              whileTap={!hasAnswered && !showResult ? { scale: 0.98 } : {}}
              disabled={hasAnswered || showResult}
              onClick={() => onAnswer(index)}
              className={`p-5 rounded-2xl border-2 font-bold text-lg transition-all ${borderColor} ${bgColor} ${textColor} ${
                hasAnswered || showResult ? "cursor-default" : "hover:border-amber-500/50"
              }`}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-gray-700 text-center leading-8 mr-3 text-sm">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
              {showResult && isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2 text-emerald-400"
                >
                  ✓
                </motion.span>
              )}
              {showResult && selected && !isCorrect && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2 text-rose-400"
                >
                  ✗
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
