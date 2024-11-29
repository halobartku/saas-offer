import { db } from '../../db';
import { emailTemplates } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class EmailTemplateService {
  /**
   * Renders an email template by replacing variables with provided values
   */
  static async renderTemplate(templateName: string, variables: Record<string, string>) {
    try {
      // Fetch template from database
      const template = await db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.name, templateName)
      });

      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      // Replace variables in subject and body
      let renderedSubject = template.subject;
      let renderedBody = template.body;

      // Replace all variables in the format {{variableName}}
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        renderedSubject = renderedSubject.replace(regex, value);
        renderedBody = renderedBody.replace(regex, value);
      });

      // Validate that all variables have been replaced
      const remainingVars = [...renderedBody.matchAll(/{{([^}]+)}}/g)];
      if (remainingVars.length > 0) {
        const missingVars = remainingVars.map(match => match[1]);
        throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
      }

      return {
        subject: renderedSubject,
        body: renderedBody
      };
    } catch (error) {
      console.error('Error rendering template:', error);
      throw error;
    }
  }

  /**
   * Validates if all required variables are provided
   */
  static validateTemplateVariables(template: typeof emailTemplates.$inferSelect, variables: Record<string, string>) {
    const providedVars = new Set(Object.keys(variables));
    const requiredVars = new Set(template.variables || []);

    const missingVars = [...requiredVars].filter(v => !providedVars.has(v));
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return true;
  }

  /**
   * Lists all available templates
   */
  static async listTemplates() {
    try {
      return await db.query.emailTemplates.findMany({
        orderBy: (templates, { desc }) => [desc(templates.createdAt)]
      });
    } catch (error) {
      console.error('Error listing templates:', error);
      throw error;
    }
  }

  /**
   * Creates a new email template
   */
  static async createTemplate(template: typeof emailTemplates.$inferInsert) {
    try {
      const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
      return newTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  }

  /**
   * Updates an existing email template
   */
  static async updateTemplate(name: string, template: Partial<typeof emailTemplates.$inferInsert>) {
    try {
      const [updatedTemplate] = await db
        .update(emailTemplates)
        .set(template)
        .where(eq(emailTemplates.name, name))
        .returning();
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  /**
   * Deletes an email template
   */
  static async deleteTemplate(name: string) {
    try {
      await db.delete(emailTemplates).where(eq(emailTemplates.name, name));
      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
}
