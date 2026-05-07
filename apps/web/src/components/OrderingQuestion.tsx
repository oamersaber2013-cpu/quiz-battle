"use client";

import { useState } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { GameStatus } from "@quiz-battle/shared";

interface OrderingItem {
  id: string;
  text: string;
  originalIndex: number;
}

interface OrderingQuestionProps {
  question: any;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: number | null;
  lastAnswerResult: any;
  language: "en" | "ar";
  onSubmit: (orderedIndices: number[]) => void;
}

export function OrderingQuestion({
  question,
  status,
  selectedAnswer,
  lastAnswerResult,
  language,
  onSubmit,
}: OrderingQuestionProps) {
  const isAr = language === "ar";
  const [items, setItems] = useState<OrderingItem[]>(() => {
    // Shuffle items initially
    const options: string[] = question.options || [];
    return options.map((text: string, index: number) => ({
      id: `item-${index}`,
      text,
      originalIndex: index,
    })).sort(() => Math.random() - 0.5);
  });
  const [submitted, setSubmitted] = useState(false);

  const hasAnswered = selectedAnswer !== null || submitted;
  const showResult = status === GameStatus.AnswerReveal || lastAnswerResult;

  const text = isAr ? question.textAr || question.text : question.textEn || question.text;
  const correctOrder: number[] = question.correctOrder || question.options?.map((_: string, i: number) => i);

  const handleSubmit = () => {
    if (hasAnswered) return;
    const currentOrder = items.map((item: OrderingItem) => item.originalIndex);
    setSubmitted(true);
    onSubmit(currentOrder);
  };

  const isOrderCorrect = () => {
    const currentOrder = items.map((item: OrderingItem) => item.originalIndex);
    return JSON.stringify(currentOrder) === JSON.stringify(correctOrder);
  };

  const getItemPosition = (originalIndex: number) => {
    return items.findIndex((item: OrderingItem) => item.originalIndex === originalIndex);
  };

  // Handle reorder - only allow when not answered
  const handleReorder = (newOrder: OrderingItem[]) => {
    if (!hasAnswered) {
      setItems(newOrder);
    }
  };

  return (
    <div className="w-full">
      {/* Question Text */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-4">
        <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
          {text}
        </p>
        <p className="text-sm text-amber-400 text-center mt-2">
          {isAr
            ? "رتب العناصر بالترتيب الصحيح (اسحب وأفلت)"
            : "Arrange items in the correct order (drag & drop)"}
        </p>
      </div>

      {/* Draggable List */}
      <div className="mb-6">
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-3"
        >
          <AnimatePresence>
            {items.map((item, position) => (
              <Reorder.Item
                key={item.id}
                value={item}
                disabled={hasAnswered || showResult}
                className={`relative ${hasAnswered || showResult ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 rounded-2xl border-2 font-bold text-lg flex items-center gap-4 transition-all ${
                    showResult
                      ? position === correctOrder.indexOf(item.originalIndex)
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-rose-500/20 border-rose-500 text-rose-400"
                      : "bg-gray-800 border-gray-700 text-white hover:border-amber-500/50"
                  }`}
                >
                  {/* Position Number */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      showResult
                        ? position === correctOrder.indexOf(item.originalIndex)
                          ? "bg-emerald-500 text-white"
                          : "bg-rose-500 text-white"
                        : "bg-gray-700 text-amber-400"
                    }`}
                  >
                    {position + 1}
                  </div>

                  {/* Drag Handle */}
                  {!hasAnswered && !showResult && (
                    <div className="text-gray-500">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <circle cx="5" cy="5" r="2" />
                        <circle cx="15" cy="5" r="2" />
                        <circle cx="5" cy="10" r="2" />
                        <circle cx="15" cy="10" r="2" />
                        <circle cx="5" cy="15" r="2" />
                        <circle cx="15" cy="15" r="2" />
                      </svg>
                    </div>
                  )}

                  {/* Item Text */}
                  <span className="flex-1">{item.text}</span>

                  {/* Result Indicator */}
                  {showResult && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`text-2xl ${
                        position === correctOrder.indexOf(item.originalIndex)
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {position === correctOrder.indexOf(item.originalIndex) ? "✓" : "✗"}
                    </motion.span>
                  )}
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Submit Button */}
      {!showResult && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={!hasAnswered ? { scale: 1.02 } : {}}
          whileTap={!hasAnswered ? { scale: 0.98 } : {}}
          disabled={hasAnswered}
          onClick={handleSubmit}
          className={`w-full p-4 rounded-2xl font-bold text-lg transition-all ${
            !hasAnswered
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          }`}
        >
          {!hasAnswered
            ? isAr
              ? "تأكيد الترتيب"
              : "Confirm Order"
            : isAr
              ? "تم التأكيد"
              : "Submitted"}
        </motion.button>
      )}

      {/* Results Summary */}
      {showResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-6 rounded-2xl border-2 text-center ${
            isOrderCorrect()
              ? "bg-emerald-500/10 border-emerald-500"
              : "bg-rose-500/10 border-rose-500"
          }`}
        >
          {isOrderCorrect() ? (
            <>
              <div className="text-4xl mb-2">🎉</div>
              <div className="text-emerald-400 font-bold text-xl">
                {isAr ? "ترتيب صحيح!" : "Perfect Order!"}
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">📋</div>
              <div className="text-rose-400 font-bold text-xl mb-3">
                {isAr ? "ترتيب خاطئ" : "Incorrect Order"}
              </div>
              <div className="text-gray-400 text-sm">
                {isAr ? "الترتيب الصحيح:" : "Correct order:"}
              </div>
              <div className="mt-3 space-y-2">
                {correctOrder?.map((index: number, position: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400"
                  >
                    <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                      {position + 1}
                    </span>
                    <span>{question.options[index]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
