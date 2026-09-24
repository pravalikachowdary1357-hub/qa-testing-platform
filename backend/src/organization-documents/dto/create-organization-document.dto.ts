import { IsUUID } from 'class-validator';

// Sent as multipart/form-data alongside the file itself, so every field
// arrives as a string -- multer parses the "file" part separately.
export class CreateOrganizationDocumentDto {
  @IsUUID()
  organizationId: string;
}
