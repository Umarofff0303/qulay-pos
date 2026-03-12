export const normalizeBarcode = (value: string | null | undefined) =>
  (value || '').trim().replace(/[\s-]+/g, '').toUpperCase();

export const getBarcodeCandidates = (value: string | null | undefined) => {
  const normalized = normalizeBarcode(value);
  const candidates = new Set<string>();

  if (!normalized) {
    return [];
  }

  candidates.add(normalized);

  if (/^\d+$/.test(normalized)) {
    if (normalized.length === 12) {
      candidates.add(`0${normalized}`);
    }

    if (normalized.length === 13 && normalized.startsWith('0')) {
      candidates.add(normalized.slice(1));
    }
  }

  return Array.from(candidates);
};

export const barcodesMatch = (
  left: string | null | undefined,
  right: string | null | undefined
) => {
  const leftCandidates = new Set(getBarcodeCandidates(left));
  return getBarcodeCandidates(right).some((candidate) => leftCandidates.has(candidate));
};

export const findByBarcode = <T extends { barcode: string | null }>(
  items: T[],
  barcode: string | null | undefined
) => items.find((item) => barcodesMatch(item.barcode, barcode)) || null;
