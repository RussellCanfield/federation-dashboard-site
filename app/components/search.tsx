export type Props = {
  onChange: (value: string) => void;
};

export default function Search({ onChange }: Props) {
  return (
    <div className="search">
      <input
        className="focus:shadow-outline w-full appearance-none rounded border py-2 px-3 leading-tight text-gray-700 shadow focus:outline-none"
        id="search"
        type="text"
        placeholder="Search dependency"
        onChange={(e) => onChange(e.target.value)}
      ></input>
    </div>
  );
}
