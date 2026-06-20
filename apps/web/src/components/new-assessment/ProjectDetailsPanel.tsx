export interface ProjectDetailsValues {
  name: string;
  reference: string;
  description: string;
}

interface ProjectDetailsPanelProps {
  values: ProjectDetailsValues;
  onChange: (values: ProjectDetailsValues) => void;
}

export function ProjectDetailsPanel({ values, onChange }: ProjectDetailsPanelProps) {
  const updateField = (field: keyof ProjectDetailsValues, value: string) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-[18px] font-semibold text-slate-950">Project details</h2>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-medium text-slate-900">Project name</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] text-slate-800 shadow-inner outline-none ring-teal-600 transition focus:ring-2"
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-slate-900">Assessment reference (optional)</span>
          <input
            className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-[14px] text-slate-800 shadow-inner outline-none ring-teal-600 transition focus:ring-2"
            value={values.reference}
            onChange={(event) => updateField("reference", event.target.value)}
          />
        </label>
      </div>
      <label className="mt-5 block">
        <span className="text-[13px] font-medium text-slate-900">Description (optional)</span>
        <textarea
          className="mt-2 h-[82px] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-3 text-[14px] text-slate-800 shadow-inner outline-none ring-teal-600 transition focus:ring-2"
          value={values.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
      </label>
    </section>
  );
}
