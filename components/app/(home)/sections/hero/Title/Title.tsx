"use client";

type Options = {
  randomizeChance?: number;
  reversed?: boolean;
};

export const encryptText = (
  text: string,
  progress: number,
  _options?: Options,
) => {
  const options = {
    randomizeChance: 0.7,
    ..._options,
  };

  const encryptionChars = "a-zA-Z0-9*=?!";
  const skipTags = ["<br class='lg-max:hidden'>", "<span>", "</span>"];

  // Calculate how many characters should be encrypted
  const totalChars = text.length;
  const encryptedCount = Math.floor(totalChars * (1 - progress));

  let result = "";
  let charIndex = 1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Check if we're at the start of a tag to skip
    let shouldSkip = false;

    for (const tag of skipTags) {
      if (text.substring(i, i + tag.length) === tag) {
        result += tag;
        i += tag.length - 1; // -1 because loop will increment
        shouldSkip = true;
        break;
      }
    }

    if (shouldSkip) continue;

    // Skip spaces - keep them as is
    if (char === " ") {
      result += char;
      charIndex++;
      continue;
    }

    // If this character should be encrypted
    if (
      options.reversed
        ? charIndex < encryptedCount
        : text.length - charIndex < encryptedCount
    ) {
      // 40% chance to show original character, 60% chance to encrypt
      if (Math.random() < options.randomizeChance) {
        result += char;
      } else {
        // Use random character from encryption set
        const randomIndex = Math.floor(Math.random() * encryptionChars.length);
        result += encryptionChars[randomIndex];
      }
    } else {
      // Keep original character
      result += char;
    }

    charIndex++;
  }

  return result;
};

export default function HomeHeroTitle() {
  return (
    <div className="text-title-h1 mx-auto text-center [&_span]:text-heat-100 mb-12 lg:mb-16">
      The Open Source <br className="lg-max:hidden" />
      <span>AI Agent Platform</span>
    </div>
  );
}
