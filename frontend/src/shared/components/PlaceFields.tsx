import { OutlinedSelect } from './outlined-field.tsx'
import { guatemalaPlaces, municipalitiesOf } from '../data/guatemala-places.ts'

export function PlaceFields({
  department,
  municipality,
  onChange,
}: {
  department: string
  municipality: string
  onChange: (value: { department: string; municipality: string }) => void
}) {
  const knownDepartment = guatemalaPlaces.some((place) => place.title === department)
  const departments = knownDepartment || !department
    ? guatemalaPlaces
    : [{ title: department, mun: municipality ? [municipality] : [] }, ...guatemalaPlaces]
  const listed = municipalitiesOf(department)
  const municipalities = municipality && !listed.includes(municipality)
    ? [municipality, ...listed]
    : listed

  return (
    <>
      <OutlinedSelect
        label="Departamento"
        required
        value={department}
        onChange={(nextDepartment) => {
          const nextMunicipalities = municipalitiesOf(nextDepartment)
          onChange({
            department: nextDepartment,
            municipality: nextMunicipalities.includes(municipality) ? municipality : '',
          })
        }}
      >
        {departments.map((place) => <option key={place.title} value={place.title}>{place.title}</option>)}
      </OutlinedSelect>
      <OutlinedSelect
        label="Municipio"
        required
        value={municipality}
        onChange={(nextMunicipality) => onChange({ department, municipality: nextMunicipality })}
      >
        <option value="">Selecciona</option>
        {municipalities.map((item) => <option key={item} value={item}>{item}</option>)}
      </OutlinedSelect>
    </>
  )
}
