import React from 'react'
import { AddItemProps } from '../AddItem'
import AddItem from '../AddItem'
export interface AddListProps {
  list: Omit<AddItemProps, 'prefix'>[]
  prefix: string
}

const AddList: React.FC<AddListProps> = ({ list, prefix }) => {
  const _prefix = `${prefix}-add-list`
  return (
    <div className={_prefix}>
      {list.map((item) => {
        return <AddItem {...item} prefix={prefix} key={item.id} />
      })}
    </div>
  )
}

export default AddList
