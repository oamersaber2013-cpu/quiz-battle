"use client";

import { useEffect, useRef, useState } from "react";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { GameStatus, type ClientQuestion, type SubmittedAnswer } from "@quiz-battle/shared";
import type { LastAnswerResult } from "@/store/gameStore";

interface OrderingItem {
  id: string;
  text: string;
  originalIndex: number;
}

interface OrderingQuestionProps {
  question: ClientQuestion;
  status: GameStatus;
  timeLeft: number;
  selectedAnswer: SubmittedAnswer | null;
  lastAnswerResult: LastAnswerResult | null;
  language: "en" | "ar";
  onSubmit: (orderedIndices: number[]) => void;
}

export function OrderingQuestion({
  question,
  status,
  timeLeft,
  selectedAnswer,
  lastAnswerResult,
  language,
  onSubmit,
}: OrderingQuestionProps) {
  const isAr = language === "ar";
  const options: string[] = (isAr ? question.optionsAr : question.optionsEn) || question.options || [];
  const buildItems = (): OrderingItem[] => {
    const source = options.map((text: string, index: number) => ({
      id: `item-${index}`,
      text,
      originalIndex: index,
    }));
    if (Array.isArray(selectedAnswer)) {
      return selectedAnswer.map((index) => source[index]).filter(Boolean);
    }
    return source.sort(() => Math.random() - 0.5);
  };
  const [items, setItems] = useState<OrderingItem[]>(buildItems);
  const [moveAnnouncement, setMoveAnnouncement] = useState("");
  const movedWithButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    setItems(buildItems());
    setMoveAnnouncement("");
  }, [question.id, selectedAnswer, language]);

  useEffect(() => {
    const button = movedWithButton.current;
    movedWithButton.current = null;
    if (button?.isConnected && document.activeElement === document.body) button.focus();
  }, [items]);

  const hasAnswered = selectedAnswer !== null;
  const showResult = status === GameStatus.AnswerReveal || !!lastAnswerResult;
  const canAnswer = status === GameStatus.Question && timeLeft > 0 && !hasAnswered && !showResult;

  const text = isAr ? question.textAr || question.text : question.textEn || question.text;
  const correctOrder = lastAnswerResult?.correctOrder || [];

  const handleSubmit = () => {
    if (!canAnswer) return;
    const currentOrder = items.map((item: OrderingItem) => item.originalIndex);
    onSubmit(currentOrder);
  };

  const isOrderCorrect = () => {
    return lastAnswerResult?.correct === true;
  };

  const handleReorder = (newOrder: OrderingItem[]) => {
    if (canAnswer) {
      setItems(newOrder);
    }
  };

  function moveItem(position: number, direction: -1 | 1, button: HTMLButtonElement | null) {
    const destination = position + direction;
    if (!canAnswer || destination < 0 || destination >= items.length) return;
    const next = [...items];
    const item = next[position];
    next[position] = next[destination];
    next[destination] = item;
    if (button && document.activeElement === button) movedWithButton.current = button;
    setItems(next);
    setMoveAnnouncement(isAr
      ? `انتقل ${item.text} إلى الموضع ${destination + 1} من ${items.length}`
      : `${item.text} moved to position ${destination + 1} of ${items.length}`);
  }

  return (
    <div className="w-full">
      {/* Question Text */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 mb-4">
        <p className="text-xl md:text-2xl font-bold text-white text-center leading-relaxed">
          {text}
        </p>
        <p className="text-sm text-amber-400 text-center mt-2">
          {isAr
            ? "رتّب العناصر بالسحب أو باستخدام زري التحريك لأعلى ولأسفل."
            : "Drag the items or use the move up and down buttons to arrange them."}
        </p>
      </div>

      {/* Draggable List */}
      <div className="mb-6">
        <Reorder.Group
          aria-label={isAr ? "ترتيب الإجابة" : "Answer order"}
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
                dragListener={canAnswer}
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
                  {canAnswer && (
                    <div className="text-muted" aria-hidden="true">
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
                  <span style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{item.text}</span>

                  {canAnswer && (
                    <div style={{ display: "flex", gap: 6 }}>
                      {([-1, 1] as const).map((direction) => {
                        const unavailable = position + direction < 0 || position + direction >= items.length;
                        const movement = direction === -1 ? (isAr ? "لأعلى" : "up") : (isAr ? "لأسفل" : "down");
                        return (
                          <button
                            key={direction}
                            type="button"
                            className="btn btn-secondary"
                            style={{ width: 44, height: 44, padding: 0, opacity: unavailable ? 0.45 : undefined }}
                            aria-label={isAr ? `حرّك ${item.text} ${movement}` : `Move ${item.text} ${movement}`}
                            aria-disabled={unavailable}
                            onPointerDownCapture={(event) => event.stopPropagation()}
                            onClick={(event) => moveItem(position, direction, event.currentTarget)}
                          >
                            <span aria-hidden="true">{direction === -1 ? "↑" : "↓"}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

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
      <p className="sr-only" role="status" aria-atomic="true">{moveAnnouncement}</p>

      {/* Submit Button */}
      {!showResult && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={!hasAnswered ? { scale: 1.02 } : {}}
          whileTap={!hasAnswered ? { scale: 0.98 } : {}}
          disabled={!canAnswer}
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
      {showResult && lastAnswerResult && (
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
                    <span>{options[index]}</span>
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
