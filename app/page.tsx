import WorkspaceEditor from '../app/components/editor/WorkspaceEditor';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 font-sans">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Binod Enterprise Studio Workspace
        </h1>
        <p className="text-sm text-gray-500">
          Decoupled Production Architecture Configured Successfully
        </p>
      </div>
      <WorkspaceEditor />
    </main>
  );
}
