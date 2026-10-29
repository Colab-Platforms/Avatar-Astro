import { Languages } from "lucide-react";
import LanguageSelector from "./LanguageSelector";
import {
  INPUT_LANGUAGE_OPTIONS,
  REPLY_LANGUAGE_OPTIONS,
  type InputLanguageChoice,
  type ReplyLanguageChoice,
} from "./languages";

interface LanguageControlsProps {
  inputLanguage: InputLanguageChoice;
  onInputLanguageChange: (v: InputLanguageChoice) => void;
  replyLanguage: ReplyLanguageChoice;
  onReplyLanguageChange: (v: ReplyLanguageChoice) => void;
}

const LanguageControls = ({
  inputLanguage,
  onInputLanguageChange,
  replyLanguage,
  onReplyLanguageChange,
}: LanguageControlsProps) => (
  <div className="mb-2.5 flex flex-wrap items-center gap-2">
    <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    <LanguageSelector
      label="You type in"
      value={inputLanguage}
      options={INPUT_LANGUAGE_OPTIONS}
      onChange={onInputLanguageChange}
    />
    <LanguageSelector
      label="Guru Ji replies in"
      value={replyLanguage}
      options={REPLY_LANGUAGE_OPTIONS}
      onChange={onReplyLanguageChange}
    />
  </div>
);

export default LanguageControls;
