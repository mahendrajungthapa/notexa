export default function SuggestedCard({ name }: { name: string }) {
  return (
    <div className="min-w-[250px] bg-gray-100 p-6 rounded-2xl text-center">
      <h4 className="font-bold">{name}</h4>

      <button className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl">
        Connect
      </button>
    </div>
  );
}