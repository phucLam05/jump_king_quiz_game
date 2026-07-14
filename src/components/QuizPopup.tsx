import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { HelpCircle, CheckCircle, Timer, Play, X } from 'lucide-react';

interface QuizPopupProps {
  isOpen: boolean;
  question: Question | null;
  checkpointId: number;
  onSaveSuccess: () => void;
  onClose: () => void;
  mode?: 'checkpoint' | 'fly';
}

export const QuizPopup: React.FC<QuizPopupProps> = ({
  isOpen,
  question,
  checkpointId,
  onSaveSuccess,
  onClose,
  mode = 'checkpoint'
}) => {
  const [step, setStep] = useState<'prompt' | 'quiz'>('prompt');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  // Reset state when popup opens for a new checkpoint
  useEffect(() => {
    if (isOpen) {
      setStep('prompt');
      setSelectedAnswer(null);
      setIsCorrect(null);
      setIsLocked(false);
      setLockTimeLeft(0);
    }
  }, [isOpen, checkpointId]);

  // Lock timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (lockTimeLeft > 0) {
      timer = setTimeout(() => {
        setLockTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (lockTimeLeft === 0 && isLocked) {
      setIsLocked(false);
      setSelectedAnswer(null);
      setIsCorrect(null);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [lockTimeLeft, isLocked]);

  if (!isOpen || !question) return null;

  const handleAnswerClick = (index: number) => {
    if (isLocked) return;

    setSelectedAnswer(index);
    if (index === question.correct) {
      setIsCorrect(true);
      // Wait 1s for success animation before saving and closing
      setTimeout(() => {
        onSaveSuccess();
      }, 1000);
    } else {
      setIsCorrect(false);
      setIsLocked(true);
      setLockTimeLeft(5);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg overflow-hidden bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-900/60 to-slate-900 border-b border-slate-750">
          <div className="flex items-center gap-3">
            <div className="p-2 text-indigo-400 bg-indigo-500/10 rounded-lg">
              <HelpCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">
                {mode === 'fly' ? "Thách Đố Lượt Bay Miễn Phí" : `Checkpoint #${checkpointId + 1}`}
              </h3>
              <p className="text-xs text-slate-400">
                {mode === 'fly' ? "Trả lời đúng để nhận 1 lượt bay tự do trong 2s" : "Lưu lại điểm hồi sinh để không bị rơi xuống đất"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition pointer-events-auto"
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {step === 'prompt' ? (
          <div className="p-6 text-center space-y-6">
            <p className="text-slate-300 text-sm md:text-base">
              {mode === 'fly'
                ? "Bạn muốn trả lời câu hỏi trắc nghiệm để nhận ngay 1 lượt bay tự do miễn phí chứ?"
                : "Bạn đang đứng tại vùng Checkpoint. Bạn muốn làm quiz để lưu lại tiến trình chơi của mình chứ?"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={onClose}
                className="px-5 py-3 text-sm font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-750 hover:text-slate-200 transition"
              >
                {mode === 'fly' ? "Để sau" : "Tiếp tục leo (Continue)"}
              </button>
              <button
                onClick={() => setStep('quiz')}
                className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 active:scale-95 transition"
              >
                <Play size={16} fill="white" />
                {mode === 'fly' ? "Bắt đầu trả lời" : "Trả lời Quiz để Lưu (Save)"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Question */}
            <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Câu hỏi</span>
              <p className="mt-1 font-semibold text-slate-200 text-sm md:text-base leading-relaxed">
                {question.question}
              </p>
            </div>

            {/* Answers */}
            <div className="grid gap-3">
              {question.answers.map((answer, index) => {
                let btnStyle = "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700";
                
                if (selectedAnswer === index) {
                  if (index === question.correct) {
                    btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                  } else {
                    btnStyle = "bg-red-500/20 border-red-500 text-red-300 animate-shake";
                  }
                } else if (isCorrect && index === question.correct) {
                  // highlight correct answer on success
                  btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300";
                }

                return (
                  <button
                    key={index}
                    disabled={isLocked || isCorrect === true}
                    onClick={() => handleAnswerClick(index)}
                    className={`w-full text-left p-4 text-sm font-medium border rounded-xl transition ${btnStyle} disabled:opacity-60 active:scale-[0.98]`}
                  >
                    <span className="inline-block w-6 h-6 mr-3 text-center leading-5 font-bold text-xs bg-slate-950/60 rounded-full text-slate-400">
                      {String.fromCharCode(65 + index)}
                    </span>
                    {answer}
                  </button>
                );
              })}
            </div>

            {/* Lock / Countdown Footer */}
            {isLocked && (
              <div className="flex items-center justify-center gap-2 p-3 text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl animate-pulse">
                <Timer size={18} className="animate-spin" />
                <span>Trả lời sai! Khóa trong {lockTimeLeft} giây... Thử lại sau.</span>
              </div>
            )}

            {isCorrect === true && (
              <div className="flex items-center justify-center gap-2 p-3 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle size={18} />
                <span>{mode === 'fly' ? "Thành công! Đã nhận 1 lượt bay." : "Hoàn thành! Đã lưu checkpoint."}</span>
              </div>
            )}

            {/* Cancel Button */}
            {isCorrect !== true && (
              <div className="flex justify-end pt-1 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl transition active:scale-95 pointer-events-auto"
                >
                  {mode === 'fly' ? "Đóng / Hủy giải đố" : "Đóng / Hủy lưu"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
