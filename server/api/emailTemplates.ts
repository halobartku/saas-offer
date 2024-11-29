import { Router } from 'express';
import { EmailTemplateService } from '../services/emailTemplateService';
import { emailTemplates } from '../../db/schema';
import type { InsertEmailTemplate } from '../../db/schema';

const router = Router();

// List all templates
router.get('/', async (req, res) => {
  try {
    const templates = await EmailTemplateService.listTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Create new template
router.post('/', async (req, res) => {
  try {
    const templateData: InsertEmailTemplate = {
      name: req.body.name,
      subject: req.body.subject,
      body: req.body.body,
      description: req.body.description,
      variables: req.body.variables,
    };
    const template = await EmailTemplateService.createTemplate(templateData);
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:name', async (req, res) => {
  try {
    const templateData: Partial<InsertEmailTemplate> = {
      subject: req.body.subject,
      body: req.body.body,
      description: req.body.description,
      variables: req.body.variables,
    };
    const template = await EmailTemplateService.updateTemplate(req.params.name, templateData);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:name', async (req, res) => {
  try {
    await EmailTemplateService.deleteTemplate(req.params.name);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Preview template
router.post('/:name/preview', async (req, res) => {
  try {
    const rendered = await EmailTemplateService.renderTemplate(
      req.params.name,
      req.body.variables
    );
    res.json(rendered);
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

export default router;
