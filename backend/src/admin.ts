import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const prismaModels = Object.fromEntries(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));

export async function buildAdmin() {
  const [{ default: AdminJS }, { default: AdminJSExpress }, prismaAdapter] = await Promise.all([
    import('adminjs'),
    import('@adminjs/express'),
    import('@adminjs/prisma'),
  ]);

  const { Database, Resource } = prismaAdapter as { Database: any; Resource: any };

  AdminJS.registerAdapter({ Database, Resource });

  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'DreamyVoice Admin',
    },
    resources: [
      { resource: { model: prismaModels.User, client: prisma }, options: { navigation: 'Контент' } },
      { resource: { model: prismaModels.Title, client: prisma }, options: { navigation: 'Контент' } },
      { resource: { model: prismaModels.Episode, client: prisma }, options: { navigation: 'Контент' } },
      { resource: { model: prismaModels.Comment, client: prisma }, options: { navigation: 'Модерация' } },
      { resource: { model: prismaModels.Session, client: prisma }, options: { navigation: 'Техническое' } },
    ],
  });

  const router = AdminJSExpress.buildRouter(admin);

  return { admin, router };
}
