import { IsObject } from 'class-validator';

export class SubmitTestDto {
  @IsObject({ message: 'answers must be an object mapping questionId to selected option index' })
  answers: Record<string, number>;
}
