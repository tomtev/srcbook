import { useNavigate, useLoaderData, useRevalidator } from 'react-router-dom';
import { AppType, CodeLanguageType } from '@srcbook/shared';
import {
  getConfig,
  createSession,
  loadSessions,
  loadSrcbookExamples,
} from '@/lib/server';
import type { ExampleSrcbookType, SessionType } from '@/types';
import { useState } from 'react';
import { ImportSrcbookModal } from '@/components/import-export-srcbook-modal';
import GenerateSrcbookModal from '@/components/generate-srcbook-modal';
import { AppCard, CreateAppButton } from '@/components/srcbook-cards';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import CreateAppModal from '@/components/apps/create-modal';
import { createApp, loadApps } from '@/clients/http/apps';
import DeleteAppModal from '@/components/delete-app-dialog';
import Onboarding from '@/components/onboarding';
import { useSettings } from '@/components/use-settings';

export async function loader() {
  const [{ result: config }, { result: srcbooks }, { result: examples }, { data: apps }] =
    await Promise.all([getConfig(), loadSessions(), loadSrcbookExamples(), loadApps('desc')]);

  return {
    defaultLanguage: config.defaultLanguage,
    baseDir: config.baseDir,
    srcbooks,
    examples,
    config,
    apps,
  };
}

type HomeLoaderDataType = {
  apps: AppType[];
  baseDir: string;
  srcbooks: SessionType[];
  examples: ExampleSrcbookType[];
  defaultLanguage: CodeLanguageType;
};

export default function Home() {
  const { apps, defaultLanguage } = useLoaderData() as HomeLoaderDataType;
  const navigate = useNavigate();

  const { revalidate } = useRevalidator();

  const [showImportSrcbookModal, setShowImportSrcbookModal] = useState(false);
  const [showGenSrcbookModal, setShowGenSrcbookModal] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [srcbookToDelete] = useState<SessionType | undefined>(undefined);

  const [appToDelete, setAppToDelete] = useState<AppType | null>(null);
  const [showCreateAppModal, setShowCreateAppModal] = useState(false);

  const { aiEnabled } = useSettings();


  async function openSrcbook(path: string) {
    const { result: srcbook } = await createSession({ path });
    navigate(`/srcbooks/${srcbook.id}`);
  }


  async function onCreateApp(name: string, prompt?: string) {
    const { data: app } = await createApp({ name, prompt });
    navigate(`/apps/${app.id}`);
  }


  if (!aiEnabled) {
    return <Onboarding />;
  }

  return (
    <div className="divide-y divide-border space-y-8 pb-10">
      {showCreateAppModal && (
        <CreateAppModal onClose={() => setShowCreateAppModal(false)} onCreate={onCreateApp} />
      )}
      {appToDelete && (
        <DeleteAppModal
          app={appToDelete}
          onClose={() => setAppToDelete(null)}
          onDeleted={() => {
            revalidate();
            setAppToDelete(null);
          }}
        />
      )}
      <DeleteSrcbookModal
        open={showDelete}
        onOpenChange={setShowDelete}
        session={srcbookToDelete}
      />
      <GenerateSrcbookModal
        open={showGenSrcbookModal}
        setOpen={setShowGenSrcbookModal}
        openSrcbook={openSrcbook}
      />
      <ImportSrcbookModal open={showImportSrcbookModal} onOpenChange={setShowImportSrcbookModal} />

      <div>
        <h4 className="h4 mx-auto mb-6">Projects</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          <CreateAppButton
            defaultLanguage={defaultLanguage}
            onClick={() => setShowCreateAppModal(true)}
          />
          {apps.map((app) => (
            <AppCard
              key={app.id}
              name={app.name}
              onClick={() => navigate(`/apps/${app.id}`)}
              onDelete={() => setAppToDelete(app)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
