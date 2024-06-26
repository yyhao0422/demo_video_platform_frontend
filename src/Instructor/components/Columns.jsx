import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";

import axios from "axios";

import { List, TextField } from "@mui/material";
import DoneIcon from "@mui/icons-material/Done";
import ClearIcon from "@mui/icons-material/Clear";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { DndContext, closestCorners } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import Section from "./Section";

function Columns({ id }) {
  const [sections, setSections] = useState([]);
  const [error, setError] = useState("");

  // Add Section State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [isLoadingAddSection, setIsLoadingAddSection] = useState(false);
  const [reload, setReload] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sectionTitleRef = useRef();
  const { getToken } = useAuth();

  useEffect(() => {
    async function fetchAllSections() {
      setIsLoading(true);
      const token = await getToken();
      try {
        const response = await fetch(
          "http://127.0.0.1:3000/api/v1/classrooms/" +
            id +
            "?populate=sections",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
          }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error("An error occurred while fetching classrooms!");
        }
        const sortedData = data.data.sections.sort((a, b) =>
          a.order > b.order ? 1 : b.order > a.order ? -1 : 0
        );

        setSections(sortedData);
      } catch (error) {
        setError(
          error.message || "An error occurred while fetching classrooms!"
        );
      }
      setIsLoading(false);
    }

    fetchAllSections();
  }, [id, reload]);

  // Add a new section to the classroom
  async function handleAddSection() {
    setIsLoadingAddSection(true);
    const token = await getToken();
    console.log({
      title: sectionTitleRef.current.value,
    });
    try {
      const res = await axios.post(
        `http://127.0.0.1:3000/api/v1/classrooms/${id}`,
        {
          title: sectionTitleRef.current.value,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.message || "An error occurred while adding section"
        );
      }
    } catch (err) {
      setError(err.message || "An error occurred while adding section");
    }
    setIsLoadingAddSection(false);
    setIsAddingSection(false);
    setReload((prev) => !prev);
  }

  // Get the position of the task in the array with the given id
  function getSectionPostion(ids) {
    return sections.findIndex((section) => section.id === ids);
  }
  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id === over.id) {
      return;
    }

    setSections((prev) => {
      const originalPos = getSectionPostion(active.id);
      const newPos = getSectionPostion(over.id);
      const reorderedSections = arrayMove(prev, originalPos, newPos);
      // Assign the index as the new order for each section
      const sectionsWithNewOrder = reorderedSections.map((section, index) => {
        return { ...section, order: index + 1 };
      });

      // Update each section in the database
      sectionsWithNewOrder.forEach(async (section) => {
        try {
          const token = await getToken();
          await axios.put(
            `http://127.0.0.1:3000/api/v1/classrooms/${id}/${section._id}`,
            {
              order: section.order,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
              },
            }
          );
        } catch (err) {
          setError(
            err.message || "An error occurred while updating section order"
          );
        }
      });

      return sectionsWithNewOrder;
    });
  }

  return (
    <List
      sx={{ width: 360 }}
      component="nav"
      aria-labelledby="nested-list-subheader"
    >
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <SortableContext
          items={sections}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => {
            return (
              <Section
                id={section.id}
                key={section.id}
                section={section}
                classroomId={id}
                reloadClassroomData={() => setReload((prev) => !prev)}
              />
            );
          })}
        </SortableContext>
      </DndContext>
      {isAddingSection && (
        <div className="w-full flex justify-between items-center">
          <TextField
            type="text"
            inputRef={sectionTitleRef}
            className="w-full  resize-none"
            color="primary"
          />
          <DoneIcon
            className="cursor-pointer hover:bg-slate-400 rounded-sm ml-3  "
            onClick={handleAddSection}
          />
          <ClearIcon
            className="cursor-pointer hover:bg-slate-400 rounded-sm ml-3"
            onClick={() => setIsAddingSection(false)}
          />
        </div>
      )}
      <div
        className="text-center cursor-pointer mt-5 text-gray-400 hover:text-gray-800"
        onClick={() => setIsAddingSection(true)}
      >
        <AddCircleOutlineIcon sx={{ marginRight: "5px" }} />
        Add Section
      </div>
    </List>
  );
}

export default Columns;
