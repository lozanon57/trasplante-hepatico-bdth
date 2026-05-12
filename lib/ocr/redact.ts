import * as ImageManipulator from 'expo-image-manipulator';

// Top 22% of a BDTH form is the patient header (name, NHC, DOB).
// Clinical data we need starts below that line.
const HEADER_FRACTION = 0.22;

export interface CroppedImage {
  uri: string;
  base64: string;
}

/**
 * Removes the patient-identifying header from a BDTH form image.
 * Returns a new image containing only the clinical data body.
 */
export async function cropHeader(
  uri: string,
  width: number,
  height: number,
): Promise<CroppedImage> {
  const originY = Math.round(height * HEADER_FRACTION);
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ crop: { originX: 0, originY, width, height: height - originY } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return { uri: result.uri, base64: result.base64! };
}
